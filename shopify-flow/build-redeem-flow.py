#!/usr/bin/env python3
"""Regenerate Shopify Flow .flow export for loyalty redemption."""

from __future__ import annotations

import hashlib
import json
import os
import time
import uuid
from pathlib import Path

FORM_ID = "1063387"

SCRIPT = """const REDEEM_POINTS = 100;
const REDEEM_VALUE_GBP = 5;

export default function main(input) {
  const customer = input.customer ?? input.metaobject?.formSubmittedBy;

  if (!customer) {
    return {
      discountCode: '',
      newLoyaltyPoints: '0',
      redeemValueGbp: String(REDEEM_VALUE_GBP),
      reused: 'false',
    };
  }

  const current = Number(customer.loyaltyPoints?.value ?? 0);
  const existingCode = String(customer.loyaltyRedeemCode?.value ?? '').trim();

  if (existingCode) {
    return {
      discountCode: existingCode,
      newLoyaltyPoints: String(current),
      redeemValueGbp: String(REDEEM_VALUE_GBP),
      reused: 'true',
    };
  }

  if (current < REDEEM_POINTS) {
    return {
      discountCode: '',
      newLoyaltyPoints: String(current),
      redeemValueGbp: String(REDEEM_VALUE_GBP),
      reused: 'false',
    };
  }

  const customerId = String(customer.id ?? '').replace(/\\D/g, '') || '0';
  const code = `KORI-${customerId}-${Date.now().toString(36).toUpperCase()}`;
  const newBalance = Math.max(0, current - REDEEM_POINTS);

  return {
    discountCode: code,
    newLoyaltyPoints: String(newBalance),
    redeemValueGbp: String(REDEEM_VALUE_GBP),
    reused: 'false',
  };
}"""

INPUT_QUERY = """query {
  metaobject {
    formSubmittedBy {
      id
      email
      loyaltyPoints {
        value
      }
      loyaltyRedeemCode {
        value
      }
    }
  }
}"""

OUTPUT_SCHEMA = (
    '"The output of Run Code"\n'
    "type Output {\n"
    '  "Discount code to create (empty if not eligible)"\n'
    "  discountCode: String!\n"
    '  "Customer points balance after redemption"\n'
    "  newLoyaltyPoints: String!\n"
    '  "GBP value of the reward"\n'
    "  redeemValueGbp: String!\n"
    '  "true when customer already has an unused code"\n'
    "  reused: String!\n"
    "}"
)

ULID_ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def new_step_id() -> str:
    return str(uuid.uuid4())


def new_ulid() -> str:
    timestamp_ms = int(time.time() * 1000)
    randomness = int.from_bytes(os.urandom(10), "big")

    value = (timestamp_ms << 80) | randomness
    chars = []
    for _ in range(26):
        chars.append(ULID_ENCODING[value & 31])
        value >>= 5
    return "".join(reversed(chars))


def single_condition(
    env_path: str,
    *,
    value_type: str,
    operator: str,
    rhs_value: str = "",
) -> dict:
    root_uuid = new_ulid()
    comp_uuid = new_ulid()
    lhs_uuid = new_ulid()
    rhs_uuid = new_ulid()
    return {
        "uuid": root_uuid,
        "lhs": {
            "uuid": comp_uuid,
            "parent_uuid": root_uuid,
            "lhs": {
                "uuid": lhs_uuid,
                "parent_uuid": comp_uuid,
                "value": env_path,
                "comparison_value_type": "EnvironmentValue",
                "full_environment_path": env_path,
            },
            "rhs": {
                "uuid": rhs_uuid,
                "parent_uuid": comp_uuid,
                "value": rhs_value,
                "comparison_value_type": "LiteralValue",
            },
            "value_type": value_type,
            "operator": operator,
            "operation_type": "Comparison",
        },
        "operator": "AND",
        "operation_type": "LogicalExpression",
    }


def condition_step(step_id: str, y: int, condition: dict) -> dict:
    return {
        "step_id": step_id,
        "step_position": [0, y],
        "config_field_values": [
            {
                "config_field_id": "condition",
                "value": json.dumps(condition, separators=(",", ":")),
            }
        ],
        "task_id": "shopify::flow::condition",
        "task_version": "0.1",
        "task_type": "CONDITION",
        "description": None,
        "note": None,
        "name": None,
    }


def customer_metafield_step(
    step_id: str,
    y: int,
    key: str,
    field_type: str,
    value_template: str,
) -> dict:
    return {
        "step_id": step_id,
        "step_position": [0, y],
        "config_field_values": [
            {
                "config_field_id": "customer_id",
                "value": json.dumps(
                    {
                        "value": "{{ metaobject.formSubmittedBy.id }}",
                        "default_value": "metaobject.formSubmittedBy.id",
                    },
                    separators=(",", ":"),
                ),
            },
            {
                "config_field_id": "metafield",
                "value": json.dumps(
                    {
                        "namespace": "custom",
                        "key": key,
                        "type": field_type,
                    },
                    separators=(",", ":"),
                ),
            },
            {
                "config_field_id": "value",
                "value": value_template,
            },
        ],
        "task_id": "shopify::admin::add_customer_metafield",
        "task_version": "1.0",
        "task_type": "ACTION",
        "description": None,
        "note": None,
        "name": None,
    }


def build_workflow(*, variant: str) -> dict:
    """variant: core (import-safe), full (includes discount + metafields)."""
    include_discount_create = variant == "full"
    include_metafields = variant == "full"
    trigger_id = new_step_id()
    cond_customer_id = new_step_id()
    run_code_id = new_step_id()
    cond_code_id = new_step_id()
    cond_reused_id = new_step_id()
    admin_api_id = new_step_id() if include_discount_create else None
    points_id = new_step_id()
    code_id = new_step_id()

    discount_inputs = {
        "basicCodeDiscount": {
            "title": "Loyalty reward {{ runCode.discountCode }}",
            "code": "{{ runCode.discountCode }}",
            "startsAt": "{{ 'now' | date: '%Y-%m-%dT%H:%M:%SZ' }}",
            "endsAt": "{{ 'now' | date: '%s' | plus: 172800 | date: '%Y-%m-%dT%H:%M:%SZ' }}",
            "customerSelection": {
                "customers": {
                    "add": ["{{ metaobject.formSubmittedBy.id }}"],
                },
            },
            "customerGets": {
                "value": {
                    "discountAmount": {
                        "amount": "{{ runCode.redeemValueGbp }}",
                        "appliesOnEachItem": False,
                    },
                },
                "items": {"all": True},
            },
            "usageLimit": 1,
            "appliesOncePerCustomer": True,
        },
    }

    steps = [
        {
            "step_id": trigger_id,
            "step_position": [0, 0],
            "config_field_values": [],
            "task_id": "shopify::admin::metaobject_created",
            "task_version": "0.1",
            "task_type": "TRIGGER",
            "description": None,
            "note": None,
            "name": None,
        },
        condition_step(
            cond_customer_id,
            120,
            single_condition(
                "metaobject.formSubmittedBy.id",
                value_type="EnvironmentScalarDefinition:ID",
                operator="not_empty_and_not_nil?",
            ),
        ),
        {
            "step_id": run_code_id,
            "step_position": [0, 260],
            "config_field_values": [
                {"config_field_id": "input", "value": INPUT_QUERY},
                {"config_field_id": "script", "value": SCRIPT},
                {"config_field_id": "output_schema", "value": OUTPUT_SCHEMA},
            ],
            "task_id": "shopify::flow::run_code",
            "task_version": "0.1",
            "task_type": "ACTION",
            "description": None,
            "note": None,
            "name": "Run code",
        },
        condition_step(
            cond_code_id,
            400,
            single_condition(
                "runCode.discountCode",
                value_type="EnvironmentScalarDefinition:String",
                operator="not_empty_and_not_nil?",
            ),
        ),
        condition_step(
            cond_reused_id,
            540,
            single_condition(
                "runCode.reused",
                value_type="EnvironmentScalarDefinition:String",
                operator="==",
                rhs_value="false",
            ),
        ),
    ]

    if include_discount_create:
        steps.append(
            {
                "step_id": admin_api_id,
                "step_position": [0, 680],
                "config_field_values": [
                    {
                        "config_field_id": "api_call",
                        "value": json.dumps(
                            {
                                "name": "discountCodeBasicCreate",
                                "blob": json.dumps(discount_inputs, separators=(",", ":")),
                            },
                            separators=(",", ":"),
                        ),
                    }
                ],
                "task_id": "shopify::admin::admin_api_operation",
                "task_version": "0.1",
                "task_type": "ACTION",
                "description": None,
                "note": None,
                "name": None,
            }
        )
        points_y = 820
    else:
        points_y = 680

    if include_metafields:
        steps.extend(
            [
                customer_metafield_step(
                    points_id,
                    points_y,
                    "loyalty_points",
                    "number_integer",
                    "{{ runCode.newLoyaltyPoints }}",
                ),
                customer_metafield_step(
                    code_id,
                    points_y + 140,
                    "loyalty_redeem_code",
                    "single_line_text_field",
                    "{{ runCode.discountCode }}",
                ),
            ]
        )

    if include_discount_create:
        links = [
            (trigger_id, "output", cond_customer_id, "input"),
            (cond_customer_id, "true", run_code_id, "input"),
            (run_code_id, "output", cond_code_id, "input"),
            (cond_code_id, "true", cond_reused_id, "input"),
            (cond_reused_id, "true", admin_api_id, "input"),
            (admin_api_id, "output", points_id, "input"),
            (points_id, "output", code_id, "input"),
        ]
    else:
        links = [
            (trigger_id, "output", cond_customer_id, "input"),
            (cond_customer_id, "true", run_code_id, "input"),
            (run_code_id, "output", cond_code_id, "input"),
            (cond_code_id, "true", cond_reused_id, "input"),
        ]

    return {
        "__metadata": {"version": 0.1},
        "root": {
            "steps": steps,
            "links": [
                {
                    "from_step_id": from_id,
                    "from_port_id": from_port,
                    "to_step_id": to_id,
                    "to_port_id": to_port,
                }
                for from_id, from_port, to_id, to_port in links
            ],
            "patched_fields": [
                {
                    "id": str(uuid.uuid4()),
                    "handle": "loyaltyPoints",
                    "field": "metafield",
                    "patched_type": "Customer",
                    "arguments": json.dumps(
                        {"key": "loyalty_points", "namespace": "custom"},
                        separators=(",", ":"),
                    ),
                    "merchant_configured": True,
                },
                {
                    "id": str(uuid.uuid4()),
                    "handle": "loyaltyRedeemCode",
                    "field": "metafield",
                    "patched_type": "Customer",
                    "arguments": json.dumps(
                        {"key": "loyalty_redeem_code", "namespace": "custom"},
                        separators=(",", ":"),
                    ),
                    "merchant_configured": True,
                },
            ],
            "variables": [],
            "note": None,
            "vertical_layout_enabled": True,
            "workflow_name": "Redeem loyalty points",
        },
    }


def export_flow(path: Path, *, variant: str) -> None:
    body = json.dumps(
        build_workflow(variant=variant),
        separators=(",", ":"),
        ensure_ascii=True,
    )
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    path.write_text(f"{digest}:{body}", encoding="utf-8")


if __name__ == "__main__":
    base = Path(__file__).parent
    export_flow(base / "Redeem loyalty points.flow", variant="core")
    export_flow(base / "Redeem loyalty points (full).flow", variant="full")
    print("Wrote Redeem loyalty points.flow (core — add discount + metafields after import)")
    print("Wrote Redeem loyalty points (full).flow")
