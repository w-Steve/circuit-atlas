"""Match explicit product identities, never substrings of unrelated zone IDs."""
def missing_product_is_modeled(product, data):
    key=lambda value:str(value).strip().casefold()
    actual={key(z['zoneId']) for z in data['spectatorZones']}
    aliases={key(a):key(b) for a,b in data.get('spectatorZoneAliases',{}).items()}
    targets=product.get('expectedZoneIds',[product['productId']])
    return any(key(t) in actual or aliases.get(key(t)) in actual for t in targets)
