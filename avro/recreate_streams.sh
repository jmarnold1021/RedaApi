#!/bin/bash

####################ab#####################
databus stream delete reda.ab.runs env:testing
databus stream create @reda.ab.runs.json

databus stream delete reda.ab.steps env:testing
databus stream create @reda.ab.steps.json

databus stream delete reda.ab.vps env:testing
databus stream create @reda.ab.vps.json

databus stream delete reda.ab.versions env:testing
databus stream create @reda.ab.versions.json

####################sb2#####################
databus stream delete reda.sb2.runs env:testing
databus stream create @reda.sb2.runs.json

databus stream delete reda.sb2.steps env:testing
databus stream create @reda.sb2.steps.json

databus stream delete reda.sb2.vps env:testing
databus stream create @reda.sb2.vps.json

databus stream delete reda.sb2.versions env:testing
databus stream create @reda.sb2.versions.json


####################v3g#####################
databus stream delete reda.v3g.runs env:testing
databus stream create @reda.v3g.runs.json

databus stream delete reda.v3g.steps env:testing
databus stream create @reda.v3g.steps.json

databus stream delete reda.v3g.vps env:testing
databus stream create @reda.v3g.vps.json

databus stream delete reda.v3g.versions env:testing
databus stream create @reda.v3g.versions.json
