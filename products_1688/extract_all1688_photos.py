#!/usr/bin/env python3
"""
Scan all .json files in the products_1688/each_company_products folder,
extract image URLs and (optionally) download them.

Downloads are performed concurrently using 20 threads for improved speed.

Saves images and logs to `products_1688/all1688_photos` with filenames like:
汕头市澄海区生彩玩具厂_企业积木定制模型入职司龄礼周年纪念摆件建筑玩具IP手办礼品定做_947525126764.jpg

Usage examples (run from repo root):
  python products_1688/extract_all1688_photos.py            # dry-run; defaults to each_company_products
  python products_1688/extract_all1688_photos.py --download # actually download images
  python products_1688/extract_all1688_photos.py --src-dir products_1688/each_company_products --download
  python products_1688/extract_all1688_photos.py --src-dir products_1688/toy_ok/each_brand_products --download

The script defaults to dry-run (prints planned filenames). Use `--download` to fetch images.
"""
import argparse
import json
import logging
import csv
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, unquote
from concurrent.futures import ThreadPoolExecutor, as_completed

IMG_EXT_RE = re.compile(r"\.(?:jpg|jpeg|png|gif|webp|bmp)(?:[?#].*)?$", re.IGNORECASE)
OFFER_RE = re.compile(r"/offer/(\d+)\.(?:html|htm)?")
INVALID_FS_CHARS = re.compile(r"[\\/:*?\"<>|]+")


def sanitize(text, max_len=200):
	if not text:
		return ""
	text = text.strip()
	text = INVALID_FS_CHARS.sub("_", text)
	text = re.sub(r"\s+", " ", text)
	if len(text) > max_len:
		text = text[:max_len]
	return text


def extract_offer_id(link):
	if not link:
		return ""
	m = OFFER_RE.search(link)
	if m:
		return m.group(1)
	# fallback: last path segment numeric
	try:
		p = urlparse(link).path
		seg = p.rstrip('/').split('/')[-1]
		seg = seg.split('.')[0]
		if seg.isdigit():
			return seg
		return seg
	except Exception:
		return ""


def find_image_urls(obj):
	urls = []

	def rec(o):
		if isinstance(o, dict):
			for v in o.values():
				rec(v)
		elif isinstance(o, list):
			for it in o:
				rec(it)
		elif isinstance(o, str):
			s = o.strip()
			# quick heuristic: contains http and an image extension
			if s.startswith('http') and IMG_EXT_RE.search(s):
				urls.append(s)

	rec(obj)
	return list(dict.fromkeys(urls))


def find_best_text(item):
	if not isinstance(item, dict):
		return ""
	# Prefer keys that match these candidates
	candidates = ['galleyName', 'galleryName', 'name', 'title', 'galleyName ']
	for k in candidates:
		if k in item and isinstance(item[k], str) and item[k].strip():
			return item[k].strip()
	# fallback: any string value that's not a url and reasonably short
	for v in item.values():
		if isinstance(v, str) and not v.startswith('http') and len(v) < 200:
			return v.strip()
	return ""


def find_offer_link(item):
	if not isinstance(item, dict):
		return ""
	for k, v in item.items():
		if isinstance(v, str) and ('offer/' in v or 'detail.1688.com' in v):
			return v
	return ""


def ensure_outdir(outdir: Path):
	outdir.mkdir(parents=True, exist_ok=True)


# module logger (configured in main)
logger = logging.getLogger(__name__)


def download_url(url, dest_path):
	try:
		import requests
		resp = requests.get(url, stream=True, timeout=20)
		resp.raise_for_status()
		with open(dest_path, 'wb') as f:
			for chunk in resp.iter_content(1024 * 32):
				if chunk:
					f.write(chunk)
		return str(dest_path)
	except Exception as e:
		logger.error("Failed to download %s: %s", url, e)
		return None


def build_filename(prefix, name, offer_id, img_url):
	# choose extension from url
	parsed = urlparse(img_url)
	path = unquote(parsed.path)
	ext = '.jpg'
	m = IMG_EXT_RE.search(path)
	if m:
		ext = m.group(0).split('?')[0]
	parts = [p for p in (prefix, name, offer_id) if p]
	base = '_'.join(parts)
	base = sanitize(base)
	if not base:
		base = sanitize(Path(parsed.path).stem)
	filename = f"{base}{ext}"
	return filename


def collect_json_files(src_dir: Path):
	return sorted([p for p in src_dir.glob('*.json') if p.is_file()])


def find_candidate_lists(obj):
	# find lists which look like product lists (list of dicts)
	found = []

	def rec(o):
		if isinstance(o, list):
			if o and all(isinstance(x, dict) for x in o):
				found.append(o)
			else:
				for it in o:
					rec(it)
		elif isinstance(o, dict):
			for v in o.values():
				rec(v)

	rec(obj)
	return found


def process_json_file(json_path: Path, outdir: Path, download=False):
	with open(json_path, 'r', encoding='utf-8') as f:
		try:
			data = json.load(f)
		except Exception as e:
			logger.error("Failed to parse %s: %s", json_path.name, e)
			return []

	lists = []
	if isinstance(data, list):
		lists = [data]
	elif isinstance(data, dict):
		lists = find_candidate_lists(data)
	else:
		logger.error("Unknown JSON root type in %s", json_path.name)
		return []

	saved = []
	download_tasks = []  # list of (url, dest_path)
	prefix = json_path.stem
	for lst in lists:
		for idx, item in enumerate(lst, start=1):
			if not isinstance(item, dict):
				continue
			urls = find_image_urls(item)
			if not urls:
				continue
			name = find_best_text(item)
			offer_link = find_offer_link(item)
			offer_id = extract_offer_id(offer_link) or ''
			for i, url in enumerate(urls, start=1):
				fname = build_filename(prefix, name, offer_id, url)
				dest = outdir / fname
				if download:
					# when downloading, avoid filesystem collisions by appending an index
					final_dest = dest
					if final_dest.exists():
						final_dest = outdir / f"{dest.stem}_{i}{dest.suffix}"
					download_tasks.append((url, final_dest))
					saved.append(str(final_dest))
					logger.info("Queued: %s", final_dest)
				else:
					# dry-run: don't consult filesystem, show canonical target name
					saved.append(str(dest))
					logger.info("Would save: %s from %s", dest, url)

	# Perform concurrent downloads
	if download and download_tasks:
		logger.info("Starting concurrent downloads for %d images", len(download_tasks))
		with ThreadPoolExecutor(max_workers=20) as executor:
			futures = [executor.submit(download_url, url, dest) for url, dest in download_tasks]
			for future in as_completed(futures):
				result = future.result()
				if result:
					logger.info("Downloaded: %s", result)

	return saved


def main():
	parser = argparse.ArgumentParser()
	parser.add_argument('--src-dir', default='.', help='Directory containing .json files (default: current)')
	parser.add_argument('--out-dir', default='all1688_photos', help='Output folder name inside src-dir')
	parser.add_argument('--download', action='store_true', help='Actually download images (default: dry-run)')
	args = parser.parse_args()

	script_dir = Path(__file__).parent.resolve()
	default_src = script_dir / 'each_company_products'
	default_outdir = script_dir / 'all1688_photos'

	# If user left --src-dir as default '.', use the repository's each_company_products
	if args.src_dir == '.':
		src = default_src
	else:
		src = Path(args.src_dir).resolve()

	# If user left --out-dir as default, place it under products_1688 (script_dir)
	if args.out_dir == 'all1688_photos':
		outdir = default_outdir
	else:
		outdir = src / args.out_dir

	ensure_outdir(outdir)

	# configure logging: console + file in outdir
	ensure_outdir(outdir)
	ts = datetime.now().strftime('%Y%m%d_%H%M%S')
	log_path = outdir / f"extract_all1688_photos_{ts}.log"
	log_formatter = logging.Formatter("%(asctime)s %(levelname)s: %(message)s", "%Y-%m-%d %H:%M:%S")
	fh = logging.FileHandler(log_path, encoding='utf-8')
	fh.setFormatter(log_formatter)
	sh = logging.StreamHandler(sys.stdout)
	sh.setFormatter(log_formatter)
	root = logging.getLogger()
	root.setLevel(logging.INFO)
	# avoid duplicate handlers if main called repeatedly
	if not any(isinstance(h, logging.FileHandler) and getattr(h, 'baseFilename', '') == str(log_path) for h in root.handlers):
		root.addHandler(fh)
	if not any(isinstance(h, logging.StreamHandler) for h in root.handlers):
		root.addHandler(sh)

	json_files = collect_json_files(src)
	if not json_files:
		logger.warning("No JSON files found in %s", src)
		return 0

	total = 0
	summary = []  # tuples of (json_name, count)
	for jf in json_files:
		logger.info("Processing %s", jf.name)
		saved = process_json_file(jf, outdir, download=args.download)
		count = len(saved)
		total += count
		summary.append((jf.name, count))
		logger.info("File %s: %d image entries", jf.name, count)

	logger.info("Processed %d JSON files. Found %d image entries (dry-run=%s).", len(json_files), total, not args.download)

	# write CSV summary
	try:
		summary_path = outdir / f"extract_summary_{ts}.csv"
		with open(summary_path, 'w', newline='', encoding='utf-8-sig') as csvf:
			writer = csv.writer(csvf)
			writer.writerow(["json_file", "image_count"])
			for row in summary:
				writer.writerow(row)
		logger.info("Wrote summary CSV: %s", summary_path)
	except Exception as e:
		logger.error("Failed to write summary CSV: %s", e)
	return 0


if __name__ == '__main__':
	sys.exit(main())

