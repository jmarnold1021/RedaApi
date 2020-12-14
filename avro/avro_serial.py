#!/usr/bin/env python

# Databus rest requires yet another conversion to
# get its the data through its JAva avro serializer
# with this script you can load a schema and a record
# to see its final outcome
import avro.io
import avro.schema
import six
from unittest import TestCase
import json
if six.PY2:
    from avro.schema import make_avsc_object
else:
    from avro.schema import SchemaFromJSONData as make_avsc_object
    long = int
from avro_json_serializer import AvroJsonSerializer, AvroJsonDeserializer

schema ={
 "type": "record",
 "name": "Metrics",
 "namespace": "reda",
 "fields": [
    {"name": "timestamp", "type": ["long", "int", "float", "double",
                                   {"name": "uint64_t", "type":"fixed", "size":8},
                                   {"name": "int64_t", "type":"fixed", "size":8}]},
    {"name": "metric", "type": "string"},
    {"name": "value", "type": ["long", "int", "float", "double",
                               {"name": "uint8_t", "type":"fixed", "size":1},
                               {"name": "uint16_t", "type":"fixed", "size":2},
                               {"name": "uint32_t", "type":"fixed", "size":4},
                               "uint64_t",
                               {"name": "int8_t", "type":"fixed", "size":1},
                               {"name": "int16_t", "type":"fixed", "size":2},
                               {"name": "int32_t", "type":"fixed", "size":4},
                               "int64_t"]},
    {"name": "tags", "type": ["null", {"type": "map", "values": "string"}]},
    {"name": "metadata", "type": ["null", {"type": "map", "values": "string"}]}
  ]
} 

# Create avro schema and serializer for schema
avro_schema = avro.schema.make_avsc_object(schema, avro.schema.Names())
serializer = AvroJsonSerializer(avro_schema)

# Create record (JSON)
record = {
"metric": 'hey',
"timestamp": 983993882838,
"value": 9,
"tags":
{
"hey": "there",
}
}
# Serialize JSON record, this will add proper union formatting (this will return a string)
record = serializer.to_json(record)
# Add proper 'value' wrapper around record (must json.loads(record) because record is a string)
message = {'value':json.loads(record)}
print "BELOW MESSAGE IS FORMATTED CORRECTLY, can be added to list and sent to databus REST"
print message
