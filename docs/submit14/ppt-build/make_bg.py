from PIL import Image, ImageDraw, ImageFilter
import math, random
W, H = 1920, 1080
def bg(path, hero=False):
    im = Image.new("RGB", (W, H), (21, 17, 13))
    px = im.load()
    for y in range(H):
        for x in range(0, W, 4):
            k = 1 - 0.35 * (((x - W * 0.5) / W) ** 2 + ((y - H * 0.45) / H) ** 2)
            c = (int(26 * k), int(21 * k), int(16 * k))
            for dx in range(4):
                px[x + dx, y] = c
    # faint layered ridges (ink wash)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    random.seed(7)
    for i, (base, amp, a) in enumerate([(880, 70, 26), (930, 60, 34), (985, 45, 44)]):
        pts = [(0, H)]
        ph = random.random() * 6
        for x in range(0, W + 20, 20):
            y = base - amp * (0.6 * math.sin(x / 210 + ph) + 0.3 * math.sin(x / 83 + ph * 2) + 0.1 * math.sin(x / 31))
            pts.append((x, y))
        pts.append((W, H))
        d.polygon(pts, fill=(120, 96, 64, a))
    layer = layer.filter(ImageFilter.GaussianBlur(2))
    im = Image.alpha_composite(im.convert("RGBA"), layer)
    d = ImageDraw.Draw(im)
    gold = (184, 145, 74, 255)
    m = 34
    d.rectangle([m, m, W - m, H - m], outline=(184, 145, 74, 150), width=2)
    d.rectangle([m + 8, m + 8, W - m - 8, H - m - 8], outline=(184, 145, 74, 70), width=1)
    # 回纹 corner brackets
    L = 46
    for cx, cy, sx, sy in [(m, m, 1, 1), (W - m, m, -1, 1), (m, H - m, 1, -1), (W - m, H - m, -1, -1)]:
        d.line([(cx, cy + sy * L), (cx, cy), (cx + sx * L, cy)], fill=gold, width=5)
        d.line([(cx + sx * 14, cy + sy * 30), (cx + sx * 14, cy + sy * 14), (cx + sx * 30, cy + sy * 14)], fill=gold, width=3)
    im.convert("RGB").save(path, quality=92)
bg("/workspace/cmit/submit14/ppt-build/bg.jpg")
print("ok")
