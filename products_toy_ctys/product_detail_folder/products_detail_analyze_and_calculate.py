from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


@dataclass
class ValueStats:
	count: int
	display_counts: Counter


@dataclass
class KeyStats:
	display_counts: Counter
	values: Dict[str, ValueStats]


def read_text(path: Path) -> str:
	return path.read_text(encoding="utf-8", errors="ignore")


def normalize_text(text: str) -> str:
	return " ".join(text.strip().split())


def normalize_key(key: str) -> str:
	return normalize_text(key).lower()


def normalize_value(value: str) -> str:
	return normalize_text(value).lower()


def is_separator_line(line: str) -> bool:
	stripped = line.strip()
	if "|" not in stripped:
		return False
	allowed = set("|-: ")
	return all(ch in allowed for ch in stripped)


def parse_markdown_tables(markdown: str) -> List[Tuple[str, str]]:
	rows: List[Tuple[str, str]] = []
	lines = markdown.splitlines()
	i = 0
	while i < len(lines) - 1:
		line = lines[i]
		next_line = lines[i + 1]
		if "|" in line and is_separator_line(next_line):
			i += 2
			while i < len(lines):
				row_line = lines[i]
				if "|" not in row_line:
					break
				row = [cell.strip() for cell in row_line.strip().strip("|").split("|")]
				if len(row) >= 2:
					key = normalize_text(row[0])
					value = normalize_text(row[1])
					if key and value:
						rows.append((key, value))
				i += 1
			continue
		i += 1
	return rows


def split_value(value: str) -> List[str]:
	normalized = normalize_text(value)
	if not normalized:
		return []

	# Prefer conservative splitting to avoid damaging rich descriptions.
	if ";" in normalized:
		parts = [p.strip() for p in normalized.split(";") if p.strip()]
		return parts

	if " / " in normalized:
		parts = [p.strip() for p in normalized.split(" / ") if p.strip()]
		return parts

	if "、" in normalized:
		parts = [p.strip() for p in normalized.split("、") if p.strip()]
		return parts

	comma_count = normalized.count(",")
	if comma_count >= 2 and "(" not in normalized and ")" not in normalized:
		parts = [p.strip() for p in normalized.split(",") if p.strip()]
		return parts

	return [normalized]


def add_key_value(stats: Dict[str, KeyStats], key: str, value: str) -> None:
	key_norm = normalize_key(key)
	value_norm = normalize_value(value)

	if key_norm not in stats:
		stats[key_norm] = KeyStats(display_counts=Counter(), values={})
	key_stats = stats[key_norm]
	key_stats.display_counts[key] += 1

	if value_norm not in key_stats.values:
		key_stats.values[value_norm] = ValueStats(count=0, display_counts=Counter())
	value_stats = key_stats.values[value_norm]
	value_stats.count += 1
	value_stats.display_counts[value] += 1


def most_common_display(counter: Counter) -> str:
	if not counter:
		return ""
	return counter.most_common(1)[0][0]


def analyze_files(file_paths: Iterable[Path]) -> Tuple[Dict[str, KeyStats], int, int, int]:
	stats: Dict[str, KeyStats] = {}
	total_files = 0
	files_with_rows = 0
	total_key_values = 0

	for path in file_paths:
		total_files += 1
		content = read_text(path)
		rows = parse_markdown_tables(content)
		if rows:
			files_with_rows += 1
		for key, value in rows:
			values = split_value(value)
			if not values:
				continue
			for item in values:
				add_key_value(stats, key, item)
				total_key_values += 1

	return stats, total_files, files_with_rows, total_key_values


def format_percent(value: Decimal) -> str:
	return f"{value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}%"


def compute_percentages(counts: List[int]) -> List[Decimal]:
	total = sum(counts)
	if total == 0:
		return [Decimal("0.00") for _ in counts]

	raw = [Decimal(c) * Decimal(100) / Decimal(total) for c in counts]
	rounded = [r.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) for r in raw]
	diff = Decimal("100.00") - sum(rounded)
	if rounded:
		rounded[-1] += diff
	return rounded


def render_section(title: str, stats: Dict[str, KeyStats], totals: Tuple[int, int, int]) -> str:
	total_files, files_with_rows, total_key_values = totals
	lines: List[str] = []
	lines.append(f"# {title}\n")
	lines.append(f"- Files scanned: {total_files}")
	lines.append(f"- Files with tables: {files_with_rows}")
	lines.append(f"- Total key-value entries: {total_key_values}\n")

	keys_sorted = sorted(
		stats.items(),
		key=lambda item: sum(v.count for v in item[1].values.values()),
		reverse=True,
	)

	for key_norm, key_stats in keys_sorted:
		display_key = most_common_display(key_stats.display_counts)
		value_items = list(key_stats.values.items())
		value_items.sort(key=lambda item: item[1].count, reverse=True)
		counts = [item[1].count for item in value_items]
		percents = compute_percentages(counts)

		lines.append(f"## {display_key}")
		total_for_key = sum(counts)
		lines.append(f"Total entries: {total_for_key}\n")
		lines.append("| Value | Count | Percent |")
		lines.append("|:------|------:|--------:|")
		for (value_norm, value_stats), percent in zip(value_items, percents):
			display_value = most_common_display(value_stats.display_counts)
			lines.append(
				f"| {display_value} | {value_stats.count} | {format_percent(percent)} |"
			)
		lines.append("")

	return "\n".join(lines).strip() + "\n"


def iter_section_files(base_dir: Path, filename: str) -> List[Path]:
	return sorted(base_dir.glob(f"*/{filename}"))


def main() -> None:
	base_dir = Path(__file__).resolve().parent
	output_path = base_dir / "products_detail_analyze_and_calculate.md"

	key_files = iter_section_files(base_dir, "key_attributes.md")
	package_files = iter_section_files(base_dir, "packaging_and_delivery.md")
	desc_files = iter_section_files(base_dir, "product_description.md")

	key_stats, key_total, key_with_rows, key_entries = analyze_files(key_files)
	package_stats, package_total, package_with_rows, package_entries = analyze_files(package_files)
	desc_stats, desc_total, desc_with_rows, desc_entries = analyze_files(desc_files)

	sections = []
	sections.append(
		render_section(
			"Key Attributes (each key total 100%)",
			key_stats,
			(key_total, key_with_rows, key_entries),
		)
	)
	sections.append(
		render_section(
			"Packaging and Delivery (each key total 100%)",
			package_stats,
			(package_total, package_with_rows, package_entries),
		)
	)
	sections.append(
		render_section(
			"Product Description (each key total 100%)",
			desc_stats,
			(desc_total, desc_with_rows, desc_entries),
		)
	)

	output_path.write_text("\n\n".join(sections).strip() + "\n", encoding="utf-8")


if __name__ == "__main__":
	main()
