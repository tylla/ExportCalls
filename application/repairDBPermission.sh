#!/bin/bash
#
luna-send -a com.palm.app.phone -n 1 palm://com.palm.db/putPermissions '{"permissions": [{"type": "db.kind", "object": "com.palm.phonecall:1", "caller": "hu.tylla.exportcalls.service", "operations": {"read":"allow"}}, {"type": "db.kind", "object": "com.palm.phonecall:1", "caller": "hu.tylla.exportcalls.service", "operations": {"read": "allow"}}]}'