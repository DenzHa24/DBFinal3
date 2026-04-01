#!/bin/bash
#
user="u37"
pass="Feed.Maybe.Tomorrow.Chance.24"
db="u37"
#
echo
#
mongoimport -d "$db" -c parts -u "$user" --password="$pass" --type="json" --file="parts_100.json" 
mongoexport -d "$db" -c parts -u "$user" -p "$pass" --type=csv --fields "_id,price,description" | tail -n +2 > parts.csv
#
echo "source parts_table.sql;" | mysql -u "$user" --password="$pass" "$db"
mysqlimport --fields-terminated-by=, --user="$user" --password="$pass" --local "$db" parts.csv
echo
