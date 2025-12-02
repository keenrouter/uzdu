#! /usr/bin/env node

import p from "../package.json" with { type: "json" };

console.log(p.version);