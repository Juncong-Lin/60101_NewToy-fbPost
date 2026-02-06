# prompt: ultra think, wright a products_toy_generate_xlxs_file\products_toy_generate_xlxs_file.py file to from each products_toy\toy\each_group_products* \products_data.json data source to generate a result.xlsx and result.csv files into the products_toy_generate_xlxs_file folder , in the result.xlsx , there are 14 "*" tabs for example : ActionFigures&RolePlay ,Arts&CraftsToys ,etc.. , then you need to auto run the products_toy_generate_xlxs_file.py and check the output result to fix until it work successsfully

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List

import pandas as pd


GROUPS_DIR = Path(__file__).resolve().parents[1] / "products_toy" / "toy" / "each_group_products"
OUTPUT_XLSX = Path(__file__).resolve().parent / "result.xlsx"
OUTPUT_CSV = Path(__file__).resolve().parent / "result.csv"


FLAT_COLUMNS: List[str] = [
	"group_name",
	"category",
	"stall_number",
	"company_code",
	"company_code_id",
	"product_code",
	"product_name",
	"name",
	"packaging",
	"qty_per_carton",
	"inner_box",
	"outer_carton_length_cm",
	"outer_carton_width_cm",
	"outer_carton_height_cm",
	"package_length_cm",
	"package_width_cm",
	"package_height_cm",
	"volume_cbm",
	"chargeable_unit_cn",
	"gross_weight_kg",
	"net_weight_kg",
	"price",
	"price_raw",
	"priceValue",
	"lower_price",
	"higher_price",
	"price/chargeable_unit",
	"excel_row",
	"priceRight",
	"marketTag",
	"tags",
	"image",
	"markdown",
	"id",
	"sku",
	"href",
]


def _flatten_product(group_name: str, product: Dict[str, Any]) -> Dict[str, Any]:
	outer_carton = product.get("outer_carton_cm") or {}
	package_cm = product.get("package_cm") or {}

	flattened = {
		"group_name": group_name,
		"category": product.get("category"),
		"stall_number": product.get("stall_number"),
		"company_code": product.get("company_code"),
		"company_code_id": product.get("company_code_id"),
		"product_code": product.get("product_code"),
		"product_name": product.get("product_name"),
		"name": product.get("name"),
		"packaging": product.get("packaging"),
		"qty_per_carton": product.get("qty_per_carton"),
		"inner_box": product.get("inner_box"),
		"outer_carton_length_cm": outer_carton.get("length"),
		"outer_carton_width_cm": outer_carton.get("width"),
		"outer_carton_height_cm": outer_carton.get("height"),
		"package_length_cm": package_cm.get("length"),
		"package_width_cm": package_cm.get("width"),
		"package_height_cm": package_cm.get("height"),
		"volume_cbm": product.get("volume_cbm"),
		"chargeable_unit_cn": product.get("chargeable_unit_cn"),
		"gross_weight_kg": product.get("gross_weight_kg"),
		"net_weight_kg": product.get("net_weight_kg"),
		"price": product.get("price"),
		"price_raw": product.get("price_raw"),
		"priceValue": product.get("priceValue"),
		"lower_price": product.get("lower_price"),
		"higher_price": product.get("higher_price"),
		"price/chargeable_unit": product.get("price/chargeable_unit"),
		"excel_row": product.get("excel_row"),
		"priceRight": product.get("priceRight"),
		"marketTag": product.get("marketTag"),
		"tags": ", ".join(product.get("tags") or []),
		"image": product.get("image"),
		"markdown": product.get("markdown"),
		"id": product.get("id"),
		"sku": product.get("sku"),
		"href": product.get("href"),
	}

	return flattened


def _iter_products(data: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
	for _, stall_map in data.items():
		if not isinstance(stall_map, dict):
			continue
		for _, products in stall_map.items():
			if not isinstance(products, list):
				continue
			for product in products:
				if isinstance(product, dict):
					yield product


def _load_group_products(group_dir: Path) -> List[Dict[str, Any]]:
	json_path = group_dir / "products_data.json"
	if not json_path.exists():
		return []

	with json_path.open("r", encoding="utf-8") as f:
		data = json.load(f)

	return list(_iter_products(data))


def build_excel() -> Path:
	if not GROUPS_DIR.exists():
		raise FileNotFoundError(f"Group directory not found: {GROUPS_DIR}")

	group_dirs = sorted([p for p in GROUPS_DIR.iterdir() if p.is_dir()])
	if not group_dirs:
		raise FileNotFoundError(f"No group folders found in: {GROUPS_DIR}")

	all_dfs: List[pd.DataFrame] = []
	tmp_xlsx = OUTPUT_XLSX.with_name(OUTPUT_XLSX.stem + ".tmp.xlsx")
	with pd.ExcelWriter(tmp_xlsx, engine="openpyxl") as writer:
		for group_dir in group_dirs:
			group_name = group_dir.name
			products = _load_group_products(group_dir)
			rows = [_flatten_product(group_name, p) for p in products]
			df = pd.DataFrame(rows, columns=FLAT_COLUMNS)
			sheet_name = group_name[:31]
			df.to_excel(writer, sheet_name=sheet_name, index=False)
			all_dfs.append(df)

	# write combined CSV of all sheets
	if all_dfs:
		combined = pd.concat(all_dfs, ignore_index=True)
		# Ensure consistent column order
		combined = combined.loc[:, [c for c in FLAT_COLUMNS if c in combined.columns]]
		combined.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
	# atomically replace final xlsx with tmp (safer on Windows if file exists)
	try:
		os.replace(tmp_xlsx, OUTPUT_XLSX)
	except Exception:
		# If replace fails, leave tmp file and inform caller
		print(f"Warning: could not replace {OUTPUT_XLSX} with {tmp_xlsx}; tmp left in place.")

	return OUTPUT_XLSX


def main() -> None:
	output_path = build_excel()
	msg = [f"Excel generated: {output_path}"]
	if OUTPUT_CSV.exists():
		msg.append(f"CSV generated: {OUTPUT_CSV}")
	print("; ".join(msg))


if __name__ == "__main__":
	main()
