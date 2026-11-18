/** 图标库：Fluent Emoji 3D（MIT）。GROUPS_3D 供分类侧栏图标面板使用 */
const GROUPS_3D = [
  { name: '电子数码', icons: [
    { key: 'phone', name: '手机', kw: '手机 phone iphone 移动电话', src: '/assets/3d/phone.png' },
    { key: 'headphone', name: '耳机', kw: '耳机 headphones', src: '/assets/3d/headphone.png' },
    { key: 'laptop', name: '笔记本电脑', kw: '电脑 笔记本 laptop', src: '/assets/3d/laptop.png' },
    { key: 'camera', name: '相机', kw: '相机 拍照 camera', src: '/assets/3d/camera.png' },
    { key: 'tv', name: '电视', kw: '电视 tv', src: '/assets/3d/tv.png' },
    { key: 'gamepad', name: '游戏机', kw: '游戏 游戏机 手柄', src: '/assets/3d/gamepad.png' },
    { key: 'printer', name: '打印机', kw: '打印机 printer', src: '/assets/3d/printer.png' },
    { key: 'keyboard', name: '键盘', kw: '键盘 keyboard', src: '/assets/3d/keyboard.png' },
    { key: 'watch', name: '手表', kw: '手表 watch', src: '/assets/3d/watch.png' },
  ]},
  { name: '家居生活', icons: [
    { key: 'house', name: '房子', kw: '房子 家 house', src: '/assets/3d/house.png' },
    { key: 'couch', name: '沙发', kw: '沙发 couch', src: '/assets/3d/couch.png' },
    { key: 'bed', name: '床', kw: '床 bed', src: '/assets/3d/bed.png' },
    { key: 'bathtub', name: '浴缸', kw: '浴缸 bathtub', src: '/assets/3d/bathtub.png' },
    { key: 'plant', name: '盆栽', kw: '盆栽 植物 plant', src: '/assets/3d/plant.png' },
    { key: 'frame', name: '相框', kw: '相框 画 frame', src: '/assets/3d/frame.png' },
  ]},
  { name: '食品生鲜', icons: [
    { key: 'pizza', name: '披萨', kw: '披萨 pizza', src: '/assets/3d/pizza.png' },
    { key: 'burger', name: '汉堡', kw: '汉堡 burger', src: '/assets/3d/burger.png' },
    { key: 'coffee', name: '咖啡', kw: '咖啡 coffee', src: '/assets/3d/coffee.png' },
    { key: 'cake', name: '蛋糕', kw: '蛋糕 cake 甜品', src: '/assets/3d/cake.png' },
    { key: 'sushi', name: '寿司', kw: '寿司 sushi', src: '/assets/3d/sushi.png' },
    { key: 'apple', name: '苹果', kw: '苹果 apple 水果', src: '/assets/3d/apple.png' },
    { key: 'fries', name: '薯条', kw: '薯条 fries', src: '/assets/3d/fries.png' },
    { key: 'banana', name: '香蕉', kw: '香蕉 banana', src: '/assets/3d/banana.png' },
    { key: 'carrot', name: '胡萝卜', kw: '胡萝卜 carrot', src: '/assets/3d/carrot.png' },
    { key: 'egg', name: '蛋', kw: '蛋 egg 鸡蛋', src: '/assets/3d/egg.png' },
    { key: 'bread', name: '面包', kw: '面包 bread', src: '/assets/3d/bread.png' },
    { key: 'meat', name: '肉', kw: '肉 meat 生鲜', src: '/assets/3d/meat.png' },
  ]},
  { name: '服饰配件', icons: [
    { key: 'tshirt', name: 'T恤', kw: 't恤 衣服 tshirt', src: '/assets/3d/tshirt.png' },
    { key: 'shirt', name: '运动衫', kw: '运动衫 衣服', src: '/assets/3d/shirt.png' },
    { key: 'boot', name: '靴子', kw: '靴子 鞋 boot', src: '/assets/3d/boot.png' },
    { key: 'glasses', name: '眼镜', kw: '眼镜 glasses', src: '/assets/3d/glasses.png' },
    { key: 'handbag', name: '手提包', kw: '包 手提包 handbag', src: '/assets/3d/handbag.png' },
    { key: 'crown', name: '皇冠', kw: '皇冠 crown', src: '/assets/3d/crown.png' },
    { key: 'ring', name: '戒指', kw: '戒指 ring 首饰', src: '/assets/3d/ring.png' },
    { key: 'necktie', name: '领带', kw: '领带 necktie', src: '/assets/3d/necktie.png' },
  ]},
  { name: '美妆健康', icons: [
    { key: 'pill', name: '药', kw: '药 pill 药品', src: '/assets/3d/pill.png' },
    { key: 'bandage', name: '创可贴', kw: '创可贴 bandage', src: '/assets/3d/bandage.png' },
    { key: 'toothbrush', name: '牙刷', kw: '牙刷 toothbrush', src: '/assets/3d/toothbrush.png' },
    { key: 'soap', name: '香皂', kw: '香皂 soap 洗护', src: '/assets/3d/soap.png' },
  ]},
  { name: '运动户外', icons: [
    { key: 'soccer', name: '足球', kw: '足球 soccer', src: '/assets/3d/soccer.png' },
    { key: 'basketball', name: '篮球', kw: '篮球 basketball', src: '/assets/3d/basketball.png' },
    { key: 'trophy', name: '奖杯', kw: '奖杯 trophy', src: '/assets/3d/trophy.png' },
    { key: 'skateboard', name: '滑板', kw: '滑板 skateboard', src: '/assets/3d/skateboard.png' },
    { key: 'bicycle', name: '自行车', kw: '自行车 单车 bicycle', src: '/assets/3d/bicycle.png' },
  ]},
  { name: '交通出行', icons: [
    { key: 'car', name: '小汽车', kw: '汽车 车 car', src: '/assets/3d/car.png' },
    { key: 'truck', name: '货车', kw: '货车 truck 卡车', src: '/assets/3d/truck.png' },
    { key: 'fuel', name: '加油泵', kw: '加油 fuel 油泵', src: '/assets/3d/fuel.png' },
  ]},
  { name: '文具学习', icons: [
    { key: 'books', name: '书', kw: '书 书籍 books', src: '/assets/3d/books.png' },
    { key: 'book', name: '书本', kw: '书 本子 book', src: '/assets/3d/book.png' },
    { key: 'pencil', name: '铅笔', kw: '铅笔 pencil 笔', src: '/assets/3d/pencil.png' },
    { key: 'gradcap', name: '学士帽', kw: '学士帽 毕业', src: '/assets/3d/gradcap.png' },
    { key: 'paintbrush', name: '画笔', kw: '画笔 paintbrush 美术', src: '/assets/3d/paintbrush.png' },
    { key: 'scissors', name: '剪刀', kw: '剪刀 scissors', src: '/assets/3d/scissors.png' },
    { key: 'pushpin', name: '图钉', kw: '图钉 pushpin', src: '/assets/3d/pushpin.png' },
  ]},
  { name: '兴趣爱好', icons: [
    { key: 'guitar', name: '吉他', kw: '吉他 guitar 乐器', src: '/assets/3d/guitar.png' },
    { key: 'notes', name: '音符', kw: '音符 music 音乐', src: '/assets/3d/notes.png' },
    { key: 'rose', name: '玫瑰', kw: '玫瑰 rose 花', src: '/assets/3d/rose.png' },
    { key: 'teddy', name: '玩偶', kw: '玩偶 泰迪熊 teddy', src: '/assets/3d/teddy.png' },
  ]},
  { name: '其他杂物', icons: [
    { key: 'package', name: '包裹', kw: '包裹 快递 箱子 package', src: '/assets/3d/package.png' },
    { key: 'gift', name: '礼物', kw: '礼物 gift', src: '/assets/3d/gift.png' },
    { key: 'moneybag', name: '钱袋', kw: '钱 财产 moneybag', src: '/assets/3d/moneybag.png' },
    { key: 'key', name: '钥匙', kw: '钥匙 key', src: '/assets/3d/key.png' },
  ]},
]

/** 关键词搜索（跨全部分组） */
function searchGroups(q) {
  if (!q || !q.trim()) return GROUPS_3D
  const s = q.trim().toLowerCase()
  const hit = (it) => it.kw.toLowerCase().includes(s) || it.name.includes(s)
  return GROUPS_3D
    .map((g) => ({ name: g.name, icons: g.icons.filter(hit) }))
    .filter((g) => g.icons.length)
}


const EMOJIS = [
  { e: '📱', name: '手机', cat: 'electronic', kw: '手机 phone' },
  { e: '💻', name: '电脑', cat: 'electronic', kw: '电脑 laptop computer 笔记本' },
  { e: '🎧', name: '耳机', cat: 'electronic', kw: '耳机 headphone' },
  { e: '📷', name: '相机', cat: 'electronic', kw: '相机 camera 拍照' },
  { e: '🎮', name: '游戏', cat: 'electronic', kw: '游戏 game 手柄' },
  { e: '⌚', name: '手表', cat: 'electronic', kw: '手表 watch' },
  { e: '🍕', name: '披萨', cat: 'food', kw: '披萨 pizza' },
  { e: '🍔', name: '汉堡', cat: 'food', kw: '汉堡 burger' },
  { e: '☕', name: '咖啡', cat: 'food', kw: '咖啡 coffee' },
  { e: '🍰', name: '蛋糕', cat: 'food', kw: '蛋糕 cake 甜品' },
  { e: '🍣', name: '寿司', cat: 'food', kw: '寿司 sushi' },
  { e: '🍎', name: '苹果', cat: 'food', kw: '苹果 apple 水果' },
  { e: '👕', name: '上衣', cat: 'clothing', kw: '衣服 上衣 tshirt' },
  { e: '👗', name: '裙子', cat: 'clothing', kw: '裙子 dress' },
  { e: '👟', name: '鞋子', cat: 'clothing', kw: '鞋 鞋子 shoe' },
  { e: '👜', name: '包', cat: 'clothing', kw: '包 手提包 bag' },
  { e: '🏠', name: '房子', cat: 'home', kw: '房子 家 home' },
  { e: '🛋️', name: '沙发', cat: 'home', kw: '沙发 couch' },
  { e: '🛏️', name: '床', cat: 'home', kw: '床 bed' },
  { e: '🪴', name: '盆栽', cat: 'home', kw: '盆栽 植物 plant' },
  { e: '🧸', name: '玩偶', cat: 'home', kw: '玩偶 泰迪熊 teddy' },
  { e: '📚', name: '书', cat: 'study', kw: '书 书籍 books' },
  { e: '✏️', name: '铅笔', cat: 'study', kw: '铅笔 pencil 笔' },
  { e: '🎓', name: '学士帽', cat: 'study', kw: '学士帽 毕业' },
  { e: '⚽', name: '足球', cat: 'sport', kw: '足球 soccer' },
  { e: '🏀', name: '篮球', cat: 'sport', kw: '篮球 basketball' },
  { e: '🏆', name: '奖杯', cat: 'sport', kw: '奖杯 trophy' },
  { e: '🚲', name: '自行车', cat: 'sport', kw: '自行车 bicycle' },
  { e: '📦', name: '包裹', cat: 'other', kw: '包裹 快递 箱子' },
  { e: '🎁', name: '礼物', cat: 'other', kw: '礼物 gift' },
  { e: '🎸', name: '吉他', cat: 'other', kw: '吉他 guitar 乐器' },
  { e: '🔑', name: '钥匙', cat: 'other', kw: '钥匙 key' },
]
function searchEmoji(list, q, getKw) {
  if (!q || !q.trim()) return list
  const s = q.trim().toLowerCase()
  return list.filter((it) => getKw(it).toLowerCase().includes(s) || (it.name || '').includes(s))
}

module.exports = { GROUPS_3D, searchGroups, EMOJIS, searchEmoji }