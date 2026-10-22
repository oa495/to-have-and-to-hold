"""Filter the SCAD CSV down to Nigeria events.

By default keeps events located in Nigeria (countryname) plus events elsewhere
whose description (issuenote) mentions Nigeria/Nigerian. Pass --location-only
to keep just the events located in Nigeria.

    python3 data/scad/filter_scad_nigeria.py
    python3 data/scad/filter_scad_nigeria.py --location-only
"""
import argparse
import csv
from pathlib import Path

DATA_DIR = Path(__file__).parent
DEFAULT_INPUT = DATA_DIR / "SCAD2018Africa_Final.csv"

# The SCAD file isn't valid UTF-8 (mixed cp1252 bytes); latin-1 round-trips every byte unchanged.
ENCODING = "latin-1"


def is_nigeria_event(row, location_only=False):
    if row["countryname"] == "Nigeria":
        return True
    return not location_only and "nigeria" in row["issuenote"].lower()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", nargs="?", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("-o", "--output", type=Path, help="output CSV (default: next to the input)")
    parser.add_argument("--location-only", action="store_true",
                        help="only keep events located in Nigeria, ignoring description matches")
    args = parser.parse_args()

    suffix = "_nigeria_located" if args.location_only else "_nigeria"
    output = args.output or args.input.with_name(f"{args.input.stem}{suffix}.csv")

    with open(args.input, encoding=ENCODING, newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = [r for r in reader if is_nigeria_event(r, args.location_only)]

    with open(output, "w", encoding=ENCODING, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    located = sum(r["countryname"] == "Nigeria" for r in rows)
    print(f"{len(rows)} events ({located} located in Nigeria, {len(rows) - located} by description) -> {output}")


if __name__ == "__main__":
    main()
