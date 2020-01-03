// vim: ft=javascript fileencoding=utf-8 bomb et:
//
// author: auau.cc based on elia
// update: 2019
// license: MIT


// 常用函数

// 用在 gr.DrawString() 接口中
function StringFormat() {
  var h_align = 0,
    v_align = 0,
    trimming = 0,
    flags = 0;
  switch (arguments.length) {
    case 4:
      flags = arguments[3];
    case 3:
      trimming = arguments[2];
    case 2:
      v_align = arguments[1];
    case 1:
      h_align = arguments[0];
      break;
    default:
      return 0;
  };
  return ((h_align << 28) | (v_align << 24) | (trimming << 20) | flags);
}

function RGBA(r, g, b, a) {
  return ((a << 24) | (r << 16) | (g << 8) | (b));
}

function RGB(r, g, b) {
  return (0xff000000 | (r << 16) | (g << 8) | (b));
}

// 常用常数，参考 Flag.txt
var DT_LEFT = 0x00000000;
var DT_CENTER = 0x00000001;
var DT_RIGHT = 0x00000002;
var DT_VCENTER = 0x00000004;
var DT_WORDBREAK = 0x00000010;
var DT_CALCRECT = 0x00000400;
var DT_NOPREFIX = 0x00000800;
var DT_END_ELLIPSIS = 0x00008000;
var DT_SINGLELINE = 0x00000020;


// Slider 类
var Slider = function (nob_img, func_get, func_set) {
  this.is_drag = false;
  this.get = (function () {
    return typeof func_get == "function" ? func_get : function () { };
  })();
  this.set = (function () {
    return typeof func_set == "function" ? func_set : function () { };
  })();
  this.pos = this.get();
  this.nob_img = nob_img ? nob_img : null;
}

Slider.prototype.draw = function (gr, x, y, w, h, y_offset, active_color, inactive_color) {
  if (h <= y_offset * 2) {
    y_offset = 0;
  }

  // 进度条背景
  gr.FillSolidRect(x, y + y_offset, w, h - y_offset * 2, inactive_color);
  if (this.pos > 0 && this.pos <= 1) {
    gr.FillSolidRect(x, y + y_offset, w * this.pos, h - y_offset * 2, active_color);
  }

  // nob 图片
  if (this.nob_img) {
    var img_w = this.nob_img.Width;
    if (!(this.pos >= 0)) {
      this.pos = 0;
    }
    gr.DrawImage(this.nob_img, x + w * this.pos - img_w / 2, (h - img_w) / 2 + y, img_w, img_w,
      0, 0, img_w, img_w, 0, 255);
  }

  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
}

Slider.prototype.is_mouse_over = function (x, y) {
  var offsite = 8; // slider点击时上下偏离宽裕度
  return (x > this.x && x < this.x + this.w && y > this.y - offsite && y < this.y + this.h + offsite);
}

Slider.prototype.down = function (x, y) {
  if (this.is_mouse_over(x, y)) {
    this.is_drag = true;
    this.move(x, y);
  }
}

Slider.prototype.up = function (x, y) {
  this.is_drag = false;
}

Slider.prototype.move = function (x, y) {
  if (this.is_drag) {
    x -= this.x;
    this.pos = x < 0 ? 0 : x > this.w ? 1 : x / this.w;
    this.set(this.pos);
    window.Repaint();
  }
}

Slider.prototype.update = function () {
  this.pos = this.get();
  window.Repaint();
}

//> 

// Button 类
var Button = function (func) {
  this.func = func;
  this.state = 0;
}

Button.prototype.is_mouse_over = function (x, y) {
  return (x > this.x && x < this.x + this.w &&
    y > this.y && y < this.y + this.h);
}

Button.prototype.draw = function (gr, img, x, y) {
  this.x = x;
  this.y = y;
  this.w = img.Width;
  this.h = img.Height;
  var alpha = 255;
  if (this.state == 2) {
    alpha = 100;
  }
  else if (this.state == 1) {
    alpha = 100;
  }
  gr.DrawImage(img, x, y, this.w, this.h, 0, 0, this.w, this.h, 0, alpha);
}

Button.prototype.is_mouse_over = function (x, y) {
  return (x > this.x && x < this.x + this.w &&
    y > this.y && y < this.y + this.h);
}

Button.prototype.change_state = function (s) {
  if (s == this.state) {
    return;
  }
  this.state = s;
  window.Repaint();
}
Button.prototype.down = function (x, y) {
  if (this.is_mouse_over(x, y)) {
    this.change_state(2);
  }
}

Button.prototype.up = function (x, y) {
  if (this.is_mouse_over(x, y)) {
    this.change_state(1);
    return true;
  } else {
    this.change_state(0);
    return false;
  }
}

Button.prototype.move = function (x, y) {
  if (this.state == 2) {
    return;
  } else {
    if (this.is_mouse_over(x, y)) {
      this.change_state(1);
    } else {
      this.change_state(0);
    }
  }
}

Button.prototype.leave = function () {
  this.change_state(0);
}

Button.prototype.on_click = function (x, y) {
  if (!this.func || typeof this.func != "function") {
    return;
  }
  this.func(x, y);
}

//>>
function reset_time() {
  length_time = "00:00";
  playback_time = "00:00";
  window.Repaint();
}

function prepare_images() {
  var g;

  nob_image_sk = gdi.CreateImage(26, 26); // 进度条nob大小
  nob_image_vl = gdi.CreateImage(20, 20); //音量条nob大小
  //// 这里的 g 和 on_paint 的参数 gr 是同个品种
  // 进度条nob样式
  g = nob_image_sk.GetGraphics();
  g.SetSmoothingMode(4);
  g.FillEllipse(1, 1, 24, 24, nob_color);  //外圈 1 + 1 + 24 = nob大小
  g.FillEllipse(8, 8, 10, 10, text_color & 0xffffffff); //内圈 8 * 2 + 10 = nob大小
  g.SetSmoothingMode(0);
  nob_image_sk.ReleaseGraphics(g);

  //音量条nob样式
  g = nob_image_vl.GetGraphics();
  g.SetSmoothingMode(4);
  g.FillEllipse(1, 1, 18, 18, nob_color);
  g.FillEllipse(6, 6, 8, 8, text_color & 0xffffffff);
  g.SetSmoothingMode(0);
  nob_image_vl.ReleaseGraphics(g);

  // 开始画图标
  var ico_font = gdi.Font("Segoe MDL2 Assets", 35, 0); // 图标样式与大小
  var ico_font_small = gdi.Font("Segoe MDL2 Assets", 23, 0);
  var ico_name = ["prev", "pause", "play", "next", "shuffle", "repeat", "repeat1", "list"]; //图标名称
  var ico_name_small = ["volume", "mute"];
  var ico_code = ["\uE100", "\uE103", "\uE102", "\uE101", "\uE14B", "\uE149", "\uE1CC", "\uE700"];   // 对应的 unicode 编码
  var ico_code_small = ["\uE15D", "\uE198"];
  var len = ico_code.length;
  var len_small = ico_code_small.length;
  var w = 70; // 按钮块占据的长度

  for (var i = 0; i < len; i++) {
    bt_images[ico_name[i]] = gdi.CreateImage(w, w);
    g = bt_images[ico_name[i]].GetGraphics();

    g.SetTextRenderingHint(3);
    g.DrawString(ico_code[i], ico_font, nob_color, 0, 0, w, w, StringFormat(1, 1));
    g.DrawString(ico_code[i], ico_font, nob_color, 0, 0, w, w, StringFormat(1, 1));
    g.DrawString(ico_code[i], ico_font, nob_color, 0, 0, w, w, StringFormat(1, 1));
    g.SetTextRenderingHint(0);

    bt_images[ico_name[i]].ReleaseGraphics(g);
  }


  for (var i = 0; i < len_small; i++) {
    bt_images[ico_name_small[i]] = gdi.CreateImage(w, w);
    g = bt_images[ico_name_small[i]].GetGraphics();

    g.SetTextRenderingHint(3);
    g.DrawString(ico_code_small[i], ico_font_small, nob_color, 0, 0, w, w, StringFormat(1, 1));
    g.DrawString(ico_code_small[i], ico_font_small, nob_color, 0, 0, w, w, StringFormat(1, 1));
    g.DrawString(ico_code_small[i], ico_font_small, nob_color, 0, 0, w, w, StringFormat(1, 1));
    g.SetTextRenderingHint(0);

    bt_images[ico_name_small[i]].ReleaseGraphics(g);
  }

}



//>

// 公共变量
var ww, wh;
var back_color = RGB(255, 255, 255);
var text_color = RGB(190, 220, 240);
var nob_color = RGB(0, 122, 217)

var nob_image_sk = null;
var nob_image_sk = null;
var bt_images = {};


// playback seeker 进度条两边时间样式
var time_font = gdi.Font("Segoe UI", 23);
var length_time = "00:00",
  playback_time = "00:00";

// 进度条
var sk;

// 音量
var vl;

//暂存静音前音量
var volume_temp = -100;

// buttons array
var bt = [];


// 70pix * 70pix大小的空间块
var block = {
  left: 3, //进度条左侧块数
  right: 5, // 进度条右侧
  right_exp: 1 //音量条右侧的块数
};

//>>

// on script load:

// 限制面板高度的最大和最小值，两值相等
// 则面板的高度固定不变，同样的还有 window.MaxWidth 
// 和 window.MinWidth.
window.MaxHeight = window.MinHeight = 70;
window.MinWidth = (block.left + block.right) * 70 + 70 * 5 + 80;
prepare_images();


// 按钮触发
bt.push(new Button(function () {
  fb.Prev();
})); // Prev
bt.push(new Button(function () {
  fb.PlayOrPause();
})); // Play or pause
bt.push(new Button(function () {
  fb.Next();
})); // Next

bt.push(new Button(function () {
  if (fb.Volume != -100) {
    volume_temp = fb.Volume;
    fb.Volume = -100;
  } else {
    fb.Volume = volume_temp;
  }
}
)); // Volume


bt.push(new Button(function () {
  if (fb.PlaybackOrder == 0) {
    fb.PlaybackOrder = 1;
  } else if (fb.PlaybackOrder == 1) {
    fb.PlaybackOrder = 2;
  } else if (fb.PlaybackOrder == 2) {
    fb.PlaybackOrder = 4;
  } else {
    fb.PlaybackOrder = 0;
  }
}));// PlaybackOder change


// 进度条参数
sk = new Slider(nob_image_sk,
  function () {
    return fb.PlaybackTime / fb.PlaybackLength;
  },
  function (pos) {
    fb.PlaybackTime = fb.PlaybackLength * pos;
  });



// 音量条参数
vl = new Slider(null, // 不需要 nob，将 nob_imge_vl改为 null， 反之亦然
  function () {
    return vol2pos(fb.Volume);
  },
  function (pos) {
    fb.Volume = pos2vol(pos);
  });


function on_size() {
  ww = window.Width;
  wh = window.Height;
}


function on_paint(gr) {
  gr.FillSolidRect(0, 0, ww, wh, back_color);

  // 进度条
  sk.draw(gr, block.left * 70 + 110, 30, ww - 220 - (block.right + block.left) * 70, 10, 7, text_color & 0xffffffff, text_color & 0x33ffffff);
  vl.draw(gr, ww - (block.right - 1) * 70 - 20, 30, (block.right - 1 - block.right_exp) * 70 - 20, 10, 7, text_color & 0xffffffff, text_color & 0x33ffffff);
  // 进度条两边的时间
  gr.GdiDrawText(playback_time, time_font, text_color & 0x00000000, block.left * 70 + 30, 0, 70, 70, DT_VCENTER | DT_CENTER | DT_CALCRECT);
  gr.GdiDrawText(length_time, time_font, text_color & 0x00000000, ww - block.right * 70 - 100, 0, 70, 70, DT_VCENTER | DT_CENTER | DT_CALCRECT);

  // 按钮
  var y = 0;
  var img_w = bt_images.prev.Width;
  var pad = 0; // 块间隔
  // 第一个按钮的 x 坐标
  var x = 20;

  var pb_order = fb.PlaybackOrder;

  bt[0].draw(gr, bt_images.prev, x, y, img_w, img_w);

  x += (img_w + pad);
  bt[1].draw(gr, fb.IsPlaying && !fb.IsPaused ? bt_images.pause : bt_images.play, x, y, img_w, img_w);

  x += (img_w + pad);
  bt[2].draw(gr, bt_images.next, x, y, img_w, img_w);

  x = (ww - block.right * img_w - 20);
  if (fb.Volume != -100) {
    bt[3].draw(gr, bt_images.volume, x, y, img_w, img_w);
  } else {
    bt[3].draw(gr, bt_images.mute, x, y, img_w, img_w);
  }


  x = (ww - (block.right - 4) * img_w - 20);
  if (pb_order == 0) {
    bt[4].draw(gr, bt_images.list, x, y, img_w, img_w);
  } else if (pb_order == 1) {
    bt[4].draw(gr, bt_images.repeat, x, y, img_w, img_w);
  } else if (pb_order == 2) {
    bt[4].draw(gr, bt_images.repeat1, x, y, img_w, img_w);
  } else {
    bt[4].draw(gr, bt_images.shuffle, x, y, img_w, img_w);
  }
}
var k = 1
function on_mouse_move(x, y) {
  if (fb.IsPlaying) {
    sk.move(x, y);
    vl.move(x, y);
    k = null;
  }

  // buttons
  for (var i = 0; i < bt.length; i++) {
    bt[i].move(x, y);
  }
}

function on_mouse_lbtn_down(x, y) {
  if (fb.IsPlaying) {
    sk.down(x, y);
    vl.down(x, y);
  }

  for (var i = 0; i < bt.length; i++) {
    bt[i].down(x, y);
  }
}

function on_mouse_lbtn_up(x, y) {
  sk.up(x, y);
  vl.up(x, y);

  for (var i = 0; i < bt.length; i++) {
    if (bt[i].up(x, y)) {
      bt[i].on_click(x, y);
    }
  }

}

function on_mouse_lbtn_dblclk(x, y, mask) {
  on_mouse_lbtn_down(x, y, mask);
}

function on_mouse_leave() {
  for (var i = 0; i < bt.length; i++) {
    bt[i].leave();
  }
}

function on_volume_change(val) {
  vl.update();
  return null;
}

function on_playback_starting() {
  reset_time();
  sk.update();
}

function on_playback_pause(state) {
  window.Repaint();
}

function on_playback_order_changed(new_order) {
  window.Repaint();
}

function on_playback_new_track(metadb) {
  length_time = fb.TitleFormat("[%length%]").EvalWithMetadb(metadb);
  window.Repaint();
}

function on_playback_stop(reason) {
  if (reason != 2) {
    sk.update();
    reset_time();
  }
}

//计算当前播放进度
function on_playback_time(time) {
  var m = Math.floor(time / 60 % 60);
  var s = String;
  if ((time - m * 60) < 10) {
    s = '0' + (time - m * 60);
  } else {
    s = (time - m * 60);
  }
  playback_time = m + ':' + s;
  sk.update();
}

// 滚轮改变播放进度
//function on_mouse_wheel(delta) {
//  fb.PlaybackTime = fb.PlaybackTime + delta * 2;
//  sk.update();
//}



// >
// on script load 

if (fb.IsPlaying) {
  on_playback_new_track(fb.GetNowPlaying());
  on_playback_time(fb.PlaybackTime);
}


// volume 函数

function pos2vol(pos) {
  return (50 * Math.log(0.99 * pos + 0.01) / Math.LN10);
};

function vol2pos(v) {
  return ((Math.pow(10, v / 50) - 0.01) / 0.99);
};



// 
