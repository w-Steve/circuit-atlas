import json,math,pathlib
rows=[
('melbourne','阿尔伯特公园赛道','澳大利亚','墨尔本','澳大利亚大奖赛','au-1953',10,5278,14,'clockwise','australia'),
('shanghai','上海国际赛车场','中国','上海','中国大奖赛','cn-2004',49,5451,16,'clockwise','china'),
('suzuka','铃鹿赛道','日本','铃鹿','日本大奖赛','jp-1962',46,5807,18,'clockwise','japan'),
('miami','迈阿密国际赛车场','美国','迈阿密','迈阿密大奖赛','us-2022',151,5412,19,'counterclockwise','miami'),
('montreal','吉勒·维伦纽夫赛道','加拿大','蒙特利尔','加拿大大奖赛','ca-1978',23,4361,14,'clockwise','canada'),
('monaco','摩纳哥赛道','摩纳哥','蒙特卡洛','摩纳哥大奖赛','mc-1929',22,3337,19,'clockwise','monaco'),
('barcelona','巴塞罗那－加泰罗尼亚赛道','西班牙','蒙特梅洛','巴塞罗那－加泰罗尼亚大奖赛','es-1991',15,4657,14,'clockwise','barcelona-catalunya'),
('spielberg','红牛环赛道','奥地利','施皮尔贝格','奥地利大奖赛','at-1969',19,4318,10,'clockwise','austria'),
('silverstone','银石赛道','英国','银石','英国大奖赛','gb-1948',2,5891,18,'clockwise','great-britain'),
('spa','斯帕－弗朗科尔尚赛道','比利时','斯帕','比利时大奖赛','be-1925',7,7004,19,'clockwise','belgium'),
('hungaroring','亨格罗宁赛道','匈牙利','莫焦罗德','匈牙利大奖赛','hu-1986',4,4381,14,'clockwise','hungary'),
('zandvoort','赞德沃特赛道','荷兰','赞德沃特','荷兰大奖赛','nl-1948',55,4259,14,'clockwise','netherlands'),
('monza','蒙扎国家赛车场','意大利','蒙扎','意大利大奖赛','it-1922',39,5793,11,'clockwise','italy'),
('madrid','马德里赛道','西班牙','马德里','西班牙大奖赛','es-2026',153,5414,22,'clockwise','spain'),
('baku','巴库城市赛道','阿塞拜疆','巴库','阿塞拜疆大奖赛','az-2016',144,6003,20,'counterclockwise','azerbaijan'),
('sepang','雪邦国际赛车场','马来西亚','雪邦','巴林大奖赛（马来西亚）','my-1999',12,5543,15,'clockwise','bahrain'),
('singapore','滨海湾街道赛道','新加坡','新加坡','新加坡大奖赛','sg-2008',61,4927,19,'counterclockwise','singapore'),
('austin','美洲赛车场','美国','奥斯汀','美国大奖赛','us-2012',9,5513,20,'counterclockwise','united-states'),
('mexico','罗德里格斯兄弟赛道','墨西哥','墨西哥城','墨西哥城大奖赛','mx-1962',65,4304,17,'clockwise','mexico'),
('interlagos','若泽·卡洛斯·帕塞赛道','巴西','圣保罗','圣保罗大奖赛','br-1940',14,4309,15,'counterclockwise','brazil'),
('las-vegas','拉斯维加斯街道赛道','美国','拉斯维加斯','拉斯维加斯大奖赛','us-2023',152,6201,17,'counterclockwise','las-vegas'),
('lusail','卢赛尔国际赛车场','卡塔尔','卢赛尔','卡塔尔大奖赛','qa-2004',150,5419,16,'clockwise','qatar'),
('yas-marina','亚斯码头赛道','阿联酋','阿布扎比','阿布扎比大奖赛','ae-2009',70,5281,16,'counterclockwise','abu-dhabi')]
manifest=[dict(zip(['id','name','country','location','grandPrix','geoId','key','length','count','direction','slug'],r),round=i+1) for i,r in enumerate(rows)]
pathlib.Path('research/season-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
