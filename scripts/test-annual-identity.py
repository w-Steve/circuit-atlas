from _annual_identity import missing_product_is_modeled as modeled
data={'spectatorZones':[{'zoneId':'principal'},{'zoneId':'village'},{'zoneId':'t9'}],'spectatorZoneAliases':{'ost-t8':'t9'}}
assert not modeled({'productId':'i'},data)
assert not modeled({'productId':'v'},data)
assert not modeled({'productId':'t8'},data)
assert modeled({'productId':'PRINCIPAL'},data)
assert modeled({'productId':'t9'},data)
assert modeled({'productId':'ost-t8'},data)
assert modeled({'productId':'east-bank','expectedZoneIds':['t9']},data)
assert not modeled({'productId':'east-bank','expectedZoneIds':['not-built']},data)
assert modeled({'productId':'i'},{'spectatorZones':[{'zoneId':'I'}]})
print('9 exact identity/explicit-alias assertions passed.')
