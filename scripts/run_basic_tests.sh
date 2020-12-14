#!/bin/bash
JUNIT_REPORT_PATH=report_test.xml istanbul cover node_modules/.bin/_mocha ./test/test_queries.js ./test/test_redarest.js
