#!/usr/bin/env python3
"""Regenerate Shopify Flow .flow export with a valid SHA256 prefix."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

SCRIPT = """function orderAmount(order) {
  const candidates = [
    order?.subtotalPriceSet?.shopMoney?.amount,
    order?.currentSubtotalPriceSet?.shopMoney?.amount,
    order?.totalPriceSet?.shopMoney?.amount,
    order?.totalRefundedSet?.shopMoney?.amount,
  ];

  for (const value of candidates) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) {
      return amount;
    }
  }

  return 0;
}

export default function main(input) {
  const order = input.order;
  const customer = order?.customer;

  if (!customer) {
    return { newLoyaltyPoints: '0' };
  }

  const current = Number(customer.loyaltyPoints?.value ?? 0);
  const earned = Math.round(orderAmount(order));

  if (earned <= 0) {
    return { newLoyaltyPoints: String(current) };
  }

  const newBalance = Math.max(0, current - earned);

  return {
    newLoyaltyPoints: String(newBalance),
  };
}"""

INPUT_QUERY = """query {
  order {
    subtotalPriceSet { shopMoney { amount } }
    currentSubtotalPriceSet { shopMoney { amount } }
    totalPriceSet { shopMoney { amount } }
    totalRefundedSet { shopMoney { amount } }
    customer {
      id
      loyaltyPoints { value }
    }
  }
}"""

OUTPUT_SCHEMA = '"The output of Run Code"\ntype Output {\n  "The customer\'s new loyalty points balance after deduction"\n  newLoyaltyPoints: String!\n}'

CONDITION = {
    "uuid": "01KX1JZ3T55YPT7CFZQ3GNYTPE",
    "lhs": {
        "uuid": "01KX1JZ3T5ZQ0MQPMTQSX7NTKD",
        "parent_uuid": "01KX1JZ3T55YPT7CFZQ3GNYTPE",
        "lhs": {
            "uuid": "01KX1JZ3T5HP2PMCNKV2RH7FWW",
            "parent_uuid": "01KX1JZ3T5ZQ0MQPMTQSX7NTKD",
            "value": "order.customer.id",
            "comparison_value_type": "EnvironmentValue",
            "full_environment_path": "order.customer.id",
        },
        "rhs": {
            "uuid": "01KX1JZ3T53KTXFJGERK1WDYF3",
            "parent_uuid": "01KX1JZ3T5ZQ0MQPMTQSX7NTKD",
            "value": "",
            "comparison_value_type": "LiteralValue",
        },
        "value_type": "EnvironmentScalarDefinition:ID",
        "operator": "not_empty_and_not_nil?",
        "operation_type": "Comparison",
    },
    "operator": "AND",
    "operation_type": "LogicalExpression",
}


def build_workflow() -> dict:
    return {
        "__metadata": {"version": 0.1},
        "root": {
            "steps": [
                {
                    "step_id": "9f3fa5ad-69d6-4559-a583-a61dcc5c6084",
                    "step_position": [0, 0],
                    "config_field_values": [],
                    "task_id": "shopify::admin::order_cancelled",
                    "task_version": "0.1",
                    "task_type": "TRIGGER",
                    "description": None,
                    "note": None,
                    "name": None,
                },
                {
                    "step_id": "a6225e89-079f-4e72-b759-60bfe59f89c9",
                    "step_position": [0, 120],
                    "config_field_values": [
                        {
                            "config_field_id": "condition",
                            "value": json.dumps(CONDITION, separators=(",", ":")),
                        }
                    ],
                    "task_id": "shopify::flow::condition",
                    "task_version": "0.1",
                    "task_type": "CONDITION",
                    "description": None,
                    "note": None,
                    "name": None,
                },
                {
                    "step_id": "c5f93c43-9d0c-4ceb-a6d8-c3d7edb640d3",
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
                {
                    "step_id": "aa6ec9cf-3c6c-4c8a-b155-210497fa7db2",
                    "step_position": [0, 400],
                    "config_field_values": [
                        {
                            "config_field_id": "customer_id",
                            "value": json.dumps(
                                {
                                    "value": "{{ order.customer.id }}",
                                    "default_value": "order.customer.id",
                                },
                                separators=(",", ":"),
                            ),
                        },
                        {
                            "config_field_id": "metafield",
                            "value": json.dumps(
                                {
                                    "namespace": "custom",
                                    "key": "loyalty_points",
                                    "type": "number_integer",
                                },
                                separators=(",", ":"),
                            ),
                        },
                        {
                            "config_field_id": "value",
                            "value": "{{ runCode.newLoyaltyPoints }}",
                        },
                    ],
                    "task_id": "shopify::admin::add_customer_metafield",
                    "task_version": "1.0",
                    "task_type": "ACTION",
                    "description": None,
                    "note": None,
                    "name": None,
                },
            ],
            "links": [
                {
                    "from_step_id": "9f3fa5ad-69d6-4559-a583-a61dcc5c6084",
                    "from_port_id": "output",
                    "to_step_id": "a6225e89-079f-4e72-b759-60bfe59f89c9",
                    "to_port_id": "input",
                },
                {
                    "from_step_id": "a6225e89-079f-4e72-b759-60bfe59f89c9",
                    "from_port_id": "true",
                    "to_step_id": "c5f93c43-9d0c-4ceb-a6d8-c3d7edb640d3",
                    "to_port_id": "input",
                },
                {
                    "from_step_id": "c5f93c43-9d0c-4ceb-a6d8-c3d7edb640d3",
                    "from_port_id": "output",
                    "to_step_id": "aa6ec9cf-3c6c-4c8a-b155-210497fa7db2",
                    "to_port_id": "input",
                },
            ],
            "patched_fields": [
                {
                    "id": "1aa7d135-1a57-4766-b6b7-017da2fba774",
                    "handle": "loyaltyPoints",
                    "field": "metafield",
                    "patched_type": "Customer",
                    "arguments": json.dumps(
                        {"key": "loyalty_points", "namespace": "custom"},
                        separators=(",", ":"),
                    ),
                    "merchant_configured": True,
                }
            ],
            "variables": [],
            "note": None,
            "vertical_layout_enabled": True,
            "workflow_name": "Deduct loyalty points on order cancelled",
        },
    }


def export_flow(path: Path) -> None:
    body = json.dumps(build_workflow(), separators=(",", ":"), ensure_ascii=True)
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    path.write_text(f"{digest}:{body}", encoding="utf-8")


if __name__ == "__main__":
    target = Path(__file__).with_name("Deduct loyalty points on order cancelled.flow")
    export_flow(target)
    print(f"Wrote {target}")
