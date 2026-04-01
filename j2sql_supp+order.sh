#!/bin/bash

user="u37"
pass="Feed.Maybe.Tomorrow.Chance.24"
db="u37"

echo "=== Flattening Suppliers and Phones ==="

# Flatten suppliers.csv
jq -r '.[] | [._id, .name, .email] | @csv' suppliers_100.json > suppliers.csv

# Flatten phones.csv (each number per supplier)
jq -r '.[] | ._id as $sid | .tel[] | [$sid, .number] | @csv' suppliers_100.json > phones.csv

echo "=== Flattening Orders and Order Items ==="

# Flatten orders.csv (supp_id + when)
jq -r '[.supp_id, .when] | @csv' orders_4000.json > orders.csv

# Flatten order_items.csv (supp_id + when + part_id + qty)
jq -r '. | .supp_id as $sid | .when as $when | .items[] | [$sid, $when, .part_id, .qty] | @csv' orders_4000.json > order_items.csv

echo "=== Importing into MySQL ==="

# Create tables
echo "source make_tables.sql;" | mysql -u "$user" --password="$pass" "$db"

# Import suppliers
mysqlimport --fields-terminated-by=, --user="$user" --password="$pass" --local "$db" suppliers.csv

# Import phones
mysqlimport --fields-terminated-by=, --user="$user" --password="$pass" --local "$db" phones.csv

# Import orders
mysqlimport --fields-terminated-by=, --user="$user" --password="$pass" --local "$db" orders.csv

# Import order_items
mysqlimport --fields-terminated-by=, --user="$user" --password="$pass" --local "$db" order_items.csv

echo "=== Done ==="

