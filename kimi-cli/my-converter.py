```python
import csv
import json

def csv_to_json(csv_file_path, json_file_path):
    with open(csv_file_path, 'r') as csvfile:
        csv_reader = csv.DictReader(csvfile)
        json_array = [row for row in csv_reader]

    with open(json_file_path, 'w') as jsonfile:
        json.dump(json_array, jsonfile)

csv_to_json('input.csv', 'output.json')
```