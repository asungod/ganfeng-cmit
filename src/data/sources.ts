/**
 * 可公开查证的出处登记表（CMIT 2026 · 内容准确性）。
 * 规则：excerpt 一律是来源页面原文摘录（2026-10-08 访问核对），不改写；
 * 核实不了的不进这里，留在内容包里标「待核」。
 * 本文件只登记出处与规则依据，不含任何个人信息。
 */

export type SourceStatus = "verified" | "partial";

export type Source = {
  id: string;
  /** 页面 / 词条 / 篇名 */
  title: string;
  /** 机构或作者 */
  publisher: string;
  /** 页面发布日期或成书时代，查不到写 "—" */
  date: string;
  url: string;
  accessed: string;
  /** verified=页面已直接打开核对；partial=页面直连失败，仅经搜索摘要核对（下表注明） */
  status: SourceStatus;
  excerpt: string;
  note?: string;
};

const ACC = "2026-10-08";

export const SOURCES: Source[] = [
  // ───────── 瓷语 ─────────
  {
    id: "dpm-fencai",
    title: "粉彩桃花纹直颈瓶（藏品页 · 附「粉彩」词条）",
    publisher: "故宫博物院",
    date: "—",
    url: "https://www.dpm.org.cn/collection/ceramic/226714.html",
    accessed: ACC,
    status: "verified",
    excerpt:
      "釉上彩品种之一。与五彩相对而言，故亦称软彩。创烧于康熙晚期，成熟于雍正、乾隆两代。……粉彩的施绘工艺是先用含砷的“玻璃白”打底；彩料有用芸香油调合。",
  },
  {
    id: "shm-fencai",
    title: "艳丽清逸（展览资源页）",
    publisher: "上海博物馆",
    date: "—",
    url: "https://www.shanghaimuseum.net/resource/museum_files/show_files/20161026154409611/P3.html",
    accessed: ACC,
    status: "partial",
    excerpt:
      "粉彩，又称\"洋彩\"，是釉上彩瓷的一个品种，始创于清康熙晚期……由于比五彩烘烧温度低……因此又有\"软彩\"之称。",
    note: "经搜索引擎摘要核对，页面未直接打开；与故宫词条结论一致，仅作旁证。",
  },
  {
    id: "dpm-hongyou",
    title: "红釉（词条）",
    publisher: "故宫博物院",
    date: "—",
    url: "https://www.dpm.org.cn/lemmas/242454.html",
    accessed: ACC,
    status: "verified",
    excerpt:
      "铜红釉最早见于唐代长沙窑瓷器上，金代钧窑曾烧造天蓝釉铜红斑瓷。元代景德镇窑创烧通体红色的釉里红瓷。真正发色纯正、呈色稳定的铜红釉瓷出现于洪武时期景德镇窑，但产量不大。永乐、宣德时期景德镇御窑曾大量烧造铜红釉瓷……因可用于祭祀日坛，故后人亦称其为“祭红釉瓷”。",
  },
  {
    id: "dpm-xianhong",
    title: "鲜红釉盘（藏品页 · 附「鲜红釉」词条）",
    publisher: "故宫博物院",
    date: "—",
    url: "https://www.dpm.org.cn/collection/ceramic/227408.html",
    accessed: ACC,
    status: "verified",
    excerpt:
      "景德镇窑自元代开始烧造高温铜红釉瓷器，初创阶段呈色多偏暗。明初永乐、宣德时期景德镇窑烧制出纯正鲜艳的红釉……器物的口沿映出白色胎骨，是因为烧制时，釉层在高温熔融状态下自然垂流，致使釉层变薄，显露出胎色，这种现象俗称“灯草口”。",
  },
  {
    id: "dpm-wucai",
    title: "五彩（词条）",
    publisher: "故宫博物院",
    date: "—",
    url: "https://www.dpm.org.cn/lemmas/239440.html",
    accessed: ACC,
    status: "verified",
    excerpt:
      "五彩是在宋、元釉上加彩的基础上发展起来的。明宣德时已有五彩，但明代釉上彩以红、绿、黄三色为多，嘉靖、万历时期的官窑釉上彩瓷，以釉下青花和釉上多种彩相结合，称青花五彩。清康熙朝……使釉上五彩成为彩瓷的主流。自雍正朝始，粉彩盛行，五彩只作为仿古瓷少量生产。……故又称“硬彩”或“古彩”。",
  },
  {
    id: "dpm-qinghua",
    title: "青花（词条）",
    publisher: "故宫博物院",
    date: "—",
    url: "https://www.dpm.org.cn/lemmas/239391.html",
    accessed: ACC,
    status: "verified",
    excerpt:
      "因蓝花在釉下，所以青花属釉下彩。其原料为含氧化钴的钴土矿，以蓝青色料在瓷胎上描绘纹饰，然后施透明釉，在高温还原焰中一次烧成。元代景德镇已能烧制成熟的青花瓷器。青花瓷器的盛行改变了青瓷为主的局面，成为明、清两代中国瓷器生产的主流。",
  },
  {
    id: "dpm-qingbai",
    title: "景德镇窑青白釉双鱼碗（藏品页 · 附「湖田窑」词条）",
    publisher: "故宫博物院",
    date: "—",
    url: "https://www.dpm.org.cn/collection/ceramic/227243.html",
    accessed: ACC,
    status: "verified",
    excerpt:
      "青白瓷，因釉色介于青白之间，白中闪青，青中闪白，故名，是景德镇湖田窑在北宋初、中期独创的釉色品种。……光照见影，故晚清以后又称之为“影青”。……（湖田窑）宋代创烧青白瓷，元代主要烧造卵白釉瓷、青花瓷、釉里红瓷、青白瓷等，明代以烧造青花瓷为主。",
  },
  {
    id: "dpm-meiping",
    title: "梅瓶（词条）",
    publisher: "故宫博物院",
    date: "—",
    url: "https://www.dpm.org.cn/lemmas/239389.html",
    accessed: ACC,
    status: "verified",
    excerpt:
      "瓶体修长，小口，短颈，丰肩，肩下渐收敛，圈足，有的附盖。梅瓶为盛酒用具。自宋代开始流行。……明清时梅瓶器型从瘦长秀丽演变为肥矮丰硕，并由日用瓷渐变为陈设瓷。",
  },
  {
    id: "dpm-yuhuchun",
    title: "玉壶春瓶（词条）",
    publisher: "故宫博物院",
    date: "—",
    url: "https://www.dpm.org.cn/lemmas/241111.html",
    accessed: ACC,
    status: "verified",
    excerpt:
      "以“玉壶先春”得名，指造型为撇口、细颈、硕腹、圈足的瓶式。……隋代已经出现。宋代定窑、龙泉窑、景德镇窑、汝窑、耀州窑、钧窑都有烧制。……宋至元代玉壶春瓶用做酒器，明、清时渐变为陈设瓷。",
  },
  {
    id: "dpm-gu",
    title: "觚（词条）",
    publisher: "故宫博物院",
    date: "—",
    url: "https://www.dpm.org.cn/lemmas/241138.html",
    accessed: ACC,
    status: "verified",
    excerpt: "我国古代饮酒器。圆体，侈口，细颈，呈喇叭形状。……元、明、清时，仿青铜觚瓷质花瓶较流行，称“花觚”。",
  },
  {
    id: "dpm-douli",
    title: "定窑白釉刻花菊瓣纹笠式碗（藏品页）",
    publisher: "故宫博物院",
    date: "—",
    url: "https://www.dpm.org.cn/collection/ceramic/228029.html",
    accessed: ACC,
    status: "verified",
    excerpt: "定窑白釉刻花菊瓣纹笠式碗，北宋……碗呈斗笠式，敞口，瘦底，圈足。",
    note: "仅证明北宋已有斗笠式碗（此例为定窑）；景德镇湖田窑斗笠碗未单独核实。",
  },
  {
    id: "tiangong",
    title: "天工开物 · 陶埏第七",
    publisher: "宋应星（明）· 维基文库（公有领域）",
    date: "明崇祯十年（1637）刊",
    url: "https://zh.wikisource.org/zh-hans/天工開物/陶埏第七",
    accessed: ACC,
    status: "verified",
    excerpt: "后世方土效灵，人工表异，陶成雅器，有素肌玉骨之象焉。掩映几筵，文明可掬。",
    note: "成书年份为通行说法，维基文库页面本身未标；引文以页面为准。",
  },
  {
    id: "ihchina-jdz",
    title: "景德镇手工制瓷技艺（国家级非遗项目页）",
    publisher: "中国非物质文化遗产网 · 中国非物质文化遗产数字博物馆",
    date: "2006（第一批）",
    url: "https://www.ihchina.cn/project_details/14270/",
    accessed: ACC,
    status: "verified",
    excerpt:
      "项目序号：357 项目编号：Ⅷ-7 公布时间：2006(第一批) 类别：传统技艺 申报地区或单位：江西省景德镇市。……考古发掘表明，景德镇自五代开始生产瓷器，宋、元两代迅速发展，至明、清时在珠山设御厂，成为全国的制瓷中心。……到元代，又发明了瓷石加高岭土的“二元配方法”及青花釉下彩绘技术。",
  },
  // ───────── 阁序 ─────────
  {
    id: "ws-tengwang",
    title: "滕王阁序（秋日登洪府滕王阁饯别序）",
    publisher: "王勃（唐）· 维基文库（公有领域）",
    date: "唐",
    url: "https://zh.wikisource.org/zh-hans/滕王阁序",
    accessed: ACC,
    status: "verified",
    excerpt:
      "时维九月，序属三秋。潦水尽而寒潭清，烟光凝而暮山紫。……飞阁流丹，下临无地。……落霞与孤鹜齐飞，秋水共长天一色。渔舟唱晚，响穷彭蠡之滨；雁阵惊寒，声断衡阳之浦。",
    note: "维基文库注：写作年龄有「时年仅十四」（《唐摭言》）与「作于上元二年」两说，本展不取具体年份。",
  },
  {
    id: "wiki-tengwangge",
    title: "滕王阁（条目）",
    publisher: "维基百科（引《旧唐书·滕王元婴传》等）",
    date: "—",
    url: "https://zh.wikipedia.org/zh-cn/滕王阁",
    accessed: ACC,
    status: "verified",
    excerpt:
      "始建于唐永徽四年。为当时任洪州都督的唐高祖李渊之子李元婴所建。……由于李元婴封号为“滕王”，故名滕王阁。……1985年，滕王阁筹建小组成立并开始重建，于1989年10月8日建成。",
    note: "二手资料；南昌市人民政府「滕王阁」页（https://www.nc.gov.cn/ncszf/rwfg/202505/caef4edf190a44099b002d0891a3d0f8.shtml）经搜索摘要给出相同年份，但本机直连超时，未能打开核对。",
  },
  {
    id: "eco-poyang",
    title: "中国最大淡水湖泊—鄱阳湖简介",
    publisher: "生态中国网（来源：湿地中国）",
    date: "2009-09-02",
    url: "http://www.eco.gov.cn/news_info/22194.html",
    accessed: ACC,
    status: "verified",
    excerpt:
      "鄱阳湖在古代有过彭蠡泽、彭泽、彭湖、扬澜、宫亭湖等多种称谓，经过漫长的历史年代……彭蠡泽向南扩展，湖水越过松门山直抵鄱阳县附近，因而易名鄱阳湖。",
    note: "另有研究指出早期文献的彭蠡泽主要在长江北岸，后来名称才沿用到今鄱阳湖一带，故本展写作「鄱阳湖一带的古称」，不写成完全等同。",
  },
  {
    id: "gmw-hengyang",
    title: "光明日报文学遗产版：也说“衡阳雁”",
    publisher: "孟国栋、孙晓磊 · 《光明日报》2020-12-07 第13版（光明网）",
    date: "2020-12-07",
    url: "https://news.gmw.cn/2020-12/07/content_34435329.htm",
    accessed: ACC,
    status: "verified",
    excerpt:
      "“衡阳雁”意象之所以生成，当与“雁不过衡阳”的观念有关。……南岳衡山有七十二峰，最南端即位于衡阳的回雁峰。……并且就实际情况来看，大雁确能飞至衡阳更南之地。",
  },
  // ───────── 客家 ─────────
  {
    id: "ln-weiwu",
    title: "世界围屋之都",
    publisher: "龙南市人民政府（市文化广电旅游局）",
    date: "2026-09-24",
    url: "https://www.jxln.gov.cn/lnzf/c103681/202509/339291f127644234b03dbf97406aff2f.shtml",
    accessed: ACC,
    status: "verified",
    excerpt:
      "龙南市境内分布有376座各具特色的围屋，占赣南客家围屋的70%以上……2012年，以龙南围屋为主的赣南客家围屋成功列入《中国世界文化遗产预备名单》。……2014年，赣南客家围屋营造技艺入选国家级非物质文化遗产代表性项目名录。……清代早中期（17-18世纪）客家围屋的建造逐步走向成熟，基本确立了高度注重防御功能，围墙高大坚固、四角炮楼凸出的基本结构特点。……其中以方形围屋居多。",
  },
  {
    id: "ln-guanxi",
    title: "世界围屋之都 · 关西新围 / 乌石围（同页）",
    publisher: "龙南市人民政府（市文化广电旅游局）",
    date: "2026-09-24",
    url: "https://www.jxln.gov.cn/lnzf/c103681/202509/339291f127644234b03dbf97406aff2f.shtml",
    accessed: ACC,
    status: "verified",
    excerpt:
      "关西新围……始建于清嘉庆三年（1798），于道光七年（1827）竣工……围墙高约8米，墙厚1米，围屋四角各建有一座10米高的炮楼。新围依山傍水，整体布局良好，集“家、祠、堡”为一体……围屋中轴线是祠堂，前后三进……2001年7月，关西新围被国务院公布为第五批全国重点文物保护单位。……（乌石围）周围设四个炮楼，围前有禾坪、照壁及日月形池塘。",
  },
  {
    id: "mct-tulou",
    title: "“福建土楼”入选《世界遗产名录》",
    publisher: "文化和旅游部官网（来源：中国文化报）",
    date: "2008-07-08",
    url: "https://www.mct.gov.cn/whzx/tpxw/200807/t20080708_828614.htm",
    accessed: ACC,
    status: "verified",
    excerpt:
      "7月6日，在加拿大魁北克城举行的第32届世界遗产大会上，中国“福建土楼”通过审议，被正式列入《世界遗产名录》。……这些土楼或方或圆，以圆为主，如珍珠般散落在闽西南的绿水青山间。",
  },
];

const BY_ID = new Map(SOURCES.map((s) => [s.id, s]));

export function sourceById(id: string): Source | undefined {
  return BY_ID.get(id);
}

/** 引用条底部一行出处：机构 · 题名 · 访问日期 */
export function sourceLine(id: string): string {
  const s = BY_ID.get(id);
  if (!s) return "";
  return `${s.publisher}《${s.title}》· ${s.url} · 访问 ${s.accessed}`;
}
