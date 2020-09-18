$(function(){
    const CFG_MUTED = 'muted';
    const CFG_VOLUME = 'volume';
    const CFG_PLAYBACK = 'playback';
    const CFG_SIMPLE_VIEW = 'simple_view';
    const CFG_PLAY_MODE = 'play_mode';
    const CFG_KEY = "config";
    const MUSIC_KEY = 'musics';
    
    const PLAY_MODE_SINGLE = 1;// 播放模式：单个循环
    const PLAY_MODE_RECYCLE = 2;// 播放模式：列表循环
    const PLAY_MODE_RANDOM = 3;// 播放模式：随机循环
    
    var config_local = undefined;// 配置对象
    var config_dirty = false;// 配置是否需要保存
    
    var title = $("title");// title对象
    var title_scroll_index = 0;// 标题滚动位置
    var audio_player = $("#h5audio_media");// 获取audio对象
    var audio_player_el = audio_player[0];// 获取audio元素
    var song_box = $("#song_box");// 获取音乐列表ul对象
    var time_duration = $("#time_show");// 当前播放时长对象
    var current_play_index = 0;// 当前播放的音乐在列表中的索引号
    var current_playing_item = undefined;// 记录当前播放的音乐li对象
    var last_play_failed_item = undefined;// 上一次播放失败的音乐项目
    var last_playing_item = undefined;// 上一个播放成功的音乐
    var btn_play = $("#btnplay");// 播放按钮对象
    var progress_bar_base = $("#spanplayer_bgbar");// 播放器进度条父对象
    var current_progress_bar = $("#spanplaybar");// 当前播放进度条
    var current_download_bar = $("#downloadbar");// 当前下载进度条
    var song_title = $("#sim_song_info>a:first");// 当前播放音乐的标题对象
    var song_author = song_title.next();// 当前播放音乐的作者
    var btn_play_mode = $("#play_mod");// 播放模式按钮
    var play_mode = undefined;// 记录当前播放模式
    var debounce_timer = false;// 防抖定时器
    var btn_simple_view_on = $("#simp_btn");
    var btn_simple_view_off = $("#off_btn");
    var view_normal = $(".player_style_normal");
    var view_clean = $(".player_style_only");
    var storage = window.localStorage;// 本机存储对象
    var name=[],url=[],resultMap;
    var btnVoice = $(".btn_big_voice");
    var volume_progress = $("#spanvolumebar");//volume bar
    var song_container = new SongContainer();
    var song_item_ui_list = [];
    
    function SongItem(name, src) {
        let typeName = typeof(name);
        if(typeName == 'string') {
            this.checked = false;
            this.singer = '';
            this.duration = 0;
            this.name = name;
            this.src = src;
        } else if(typeName == 'object') {
            for(prop in name)
                this[prop] = name[prop];
        }
    }
    
    SongItem.prototype.setChecked = function(checked) {
        if(this.checked == checked)
            return;
        
        this.checked = checked;
        if(this.onCheckChanged)
            this.onCheckChanged(this, checked);
    }
    
    function SongContainer() {
        this.items = [];
        this.playing = -1;
        this.dirty = false;
    }
    
    SongContainer.prototype.getPlayingIndex = function() {
        return this.playing;
    }
    
    SongContainer.prototype.setPlayingIndex = function(index) {
        if(this.playing == index)
            return;
        
        let oldIndex = this.playing;
        this.playing = index;
        if(this.onPlayingIndexChanged)
            this.onPlayingIndexChanged(oldIndex, index);
    }
    
    SongContainer.prototype.getPlayingItem = function() {
        return this.items[this.playing] || null;
    }
    
    SongContainer.prototype.getItem = function(index) {
        return this.items[index] || null;
    }
    
    SongContainer.prototype.getSize = function() {
        return this.items.length;
    }
    
    SongContainer.prototype.add = function(item, index) {
        if(index == undefined) {
            index = this.items.length;
            this.items.push(item);
        } else {
            this.items.splice(index, 0, item);
        }
        this.dirty = true;
        item.onCheckChanged = this.onItemCheckChanged;
        
        if(this.onItemAdded != undefined) {
            this.onItemAdded([item], [index]);
        }
    }
    
    SongContainer.prototype.remove = function(index) {
        let items = this.items.splice(index, 1);
        this.dirty = true;
        
        if(this.onItemRemoved != undefined) {
            this.onItemRemoved(items, [index]);
        }
    }
    
    SongContainer.prototype.save = function() {
        if(this.dirty) {
            this.dirty = false;
            window.localStorage.setItem(MUSIC_KEY, JSON.stringify(this));
        }
    }
    
    SongContainer.prototype.load = function() {
        let default_musics = {
            items: []
        };
        let musics = JSON.parse(window.localStorage.getItem(MUSIC_KEY)) || default_musics;
        let items = musics['items']
        for(let i=0;i<items.length;i++) {
            this.add(new SongItem(items[i]));
        }
    }
    
    SongContainer.prototype.clear = function() {
        for(let i=this.items.length-1;i>=0;i--)
            this.remove(i);
    }
    
    SongContainer.prototype.removeSelectedItems = function() {
        for(let i=this.items.length-1;i>=0;i--) {
            if(!this.items[i].checked)
                continue;
            
            this.remove(i);
        }
    }
    
    SongContainer.prototype.selectAll = function() {
        for(let i=this.items.length-1;i>=0;i--) {
            this.items[i].setChecked(true);
        }
    }
    
    SongContainer.prototype.unSelectAll = function() {
        for(let i=this.items.length-1;i>=0;i--) {
            this.items[i].setChecked(false);
        }
    }
    
    SongContainer.prototype.setChecked = function(index, checked) {
        if(index<0 || index>=this.items.length)
            return;
        
        this.items[index].setChecked(checked);
    }
    
    SongContainer.prototype.indexOf = function(item) {
        return this.items.indexOf(item);
    }
    
    // 音乐条目界面类
    function SongItemUI(item) {
        let tpl = "\
            <li> \
                <div class=\"songlist__item\"> \
                <div class=\"songlist__edit sprite\"> \
                    <input type=\"checkbox\" class=\"songlist__checkbox\"> \
                </div> \
                <div class=\"songlist__number\">1</div> \
                <div class=\"songlist__songname\"> \
                    <span class=\"songlist__songname_txt\" title=\"Onimusha 3 Opening\">Onimusha 3 Opening</span> \
                    <div class=\"mod_list_menu\"> \
                        <a href=\"javascript:;\" class=\"list_menu__item list_menu__play js_play\" title=\"暂停\"> \
                            <i class=\"list_menu__icon_play\"></i> \
                            <span class=\"icon_txt\">暂停</span> \
                        </a> \
                        <a href=\"javascript:;\" class=\"list_menu__item list_menu__add js_fav\"  title=\"添加到歌单\"> \
                            <i class=\"list_menu__icon_add\"></i> \
                            <span class=\"icon_txt\">添加到歌单</span> \
                        </a> \
                        <a href=\"javascript:;\" class=\"list_menu__item list_menu__down js_down\" title=\"下载\"> \
                            <i class=\"list_menu__icon_down\"></i> \
                            <span class=\"icon_txt\">下载</span> \
                        </a> \
                        <a href=\"javascript:;\" class=\"list_menu__item list_menu__share js_share\"  title=\"分享\"> \
                            <i class=\"list_menu__icon_share\"></i> \
                            <span class=\"icon_txt\">分享</span> \
                        </a> \
                    </div> \
                </div> \
                <div class=\"songlist__artist\" title=\"Bilge Theall\"> \
                    <a href=\"#\" title=\"Bilge Theall\" class=\"singer_name\">Bilge Theall</a> \
                </div> \
                <div class=\"songlist__time\">00:00</div> \
                <div class=\"songlist__other\"> \
                </div> \
                <a href=\"javascript:;\" class=\"songlist__delete js_delete\" title=\"删除\"> \
                    <span class=\"icon_txt\">删除</span></a> \
                    <i class=\"player_songlist__line\"></i> \
                </div> \
            </li>";
        this.jqSelf = $(tpl);
        this.jqName = this.jqSelf.find(".songlist__songname_txt");
        this.jqNumber = this.jqSelf.find(".songlist__number");
        this.jqBtnPlay = this.jqSelf.find(".list_menu__play");
        this.jqBtnDelete = this.jqSelf.find(".songlist__delete");
        this.jqCheckBox = this.jqSelf.find(".songlist__checkbox");
        this.jqBtnDownload = this.jqSelf.find(".list_menu__down");
        
        if(item != undefined) {
            this.setTitle(item.name);
            this.setSrc(item.src);
        }
    }
    
    SongItemUI.prototype.setChecked = function(checked) {
        const checkStr = 'checked';
        if(checked)
            this.jqCheckBox.attr(checkStr, checkStr);
        else
            this.jqCheckBox.removeAttr(checkStr);
    }
    
    SongItemUI.prototype.setPlaying = function(show) {
        const cls = 'songlist__item--playing';
        if(show)
            this.jqSelf.addClass(cls);
        else
            this.jqSelf.removeClass(cls);
    }
    
    SongItemUI.prototype.setTitle = function(title) {
        this.jqName.attr('title', title);
        this.jqName.text(title);
    }
    
    SongItemUI.prototype.setSrc = function(src) {
        this.jqName.attr('src', src);
    }
    
    SongItemUI.prototype.setNumber = function(number) {
        this.jqNumber.text(number);
    }
    
    SongItemUI.prototype.bindPlayClicked = function(func) {
        this.jqBtnPlay.click(func);
    }
    
    SongItemUI.prototype.bindDeleteClicked = function(func) {
        this.jqBtnDelete.click(func);
    }
    
    SongItemUI.prototype.bindCheckBoxClicked = function(func) {
        this.jqCheckBox.click(func);
    }
    
    SongItemUI.prototype.bindDownloadClicked = function(func) {
        this.jqBtnDownload.click(func);
    }
    
    SongItemUI.prototype.getJqObject = function() {
        return this.jqSelf;
    }
    
    // 设置图标
    function setIcon(icon) {
        var favicon = document.createElement('link');//创建一个link元素
        favicon.rel = 'shortcut icon';
        favicon.href = icon;
        favicon.type = 'image/x-icon';
        document.head.append(favicon);//附加到head标签下
    }
    
    // 将一个秒数转换成时间格式
    // secs 一个秒数字
    function secondsToTimeStr(secs) {
        if(secs==undefined || isNaN(secs))// 判断是否是非法数字
            secs = 0;
        var n = parseInt(secs / 60, 10);// 求分钟数
        var e = parseInt(secs % 60, 10);// 求剩余的秒数
        return (n < 10 ? "0" + n: n) + ":" + (e < 10 ? "0" + e: e);// 返回时间格式，例如12:33，如果分秒数不足10，前面补0
    }
    
    // 节流函数：让函数在一定时间段内只执行一次
    // func 要执行的函数
    // delay 执行间隔
    function throttle(func, delay) {
        var prev = Date.now();// 记录当前时间
        return function() {//返回函数对象
            var context = this;// 记录当前对象
            var args = arguments;// 记录参数
            var now = Date.now();// 记录现在时间
            if (now - prev >= delay) {// 判断是否超过间隔时间
                func.apply(context, args);// 执行函数func
                prev = Date.now();// 重新开始记录时间
            }
        }
    }
    
    // 保证最后一次事件发生后经过一段时间再执行函数
    // callback 要执行的回调函数
    // time 超时间隔
    debounce = function(callback, time) {
        clearTimeout(debounce_timer);// 清除定时器
        debounce_timer = setTimeout(callback, time);// 重新设置定时器
    }
    
    // 加载音频
    function loadAudio(index) {
        song_items = song_box.find("li>div");
        if(typeof(index) == "number") {
            songs_count = song_items.length;
            index = index % songs_count;
            current_play_index = index;
            index = $(song_items[index]);
        } else {
            current_play_index = song_items.index(index.length==1?index[0]:index);
        }
        if(current_playing_item == index || 
            (current_playing_item!=undefined && index!=undefined && current_playing_item[0]==index[0]))
            return;
            
        title_scroll_index = 0;
        last_playing_item = current_playing_item;
        current_playing_item = index;
        audio_src = current_playing_item.find(".songlist__songname_txt").attr("src");
        audio_player.attr("src", audio_src);
        audio_player_el.playbackRate = getParameter(CFG_PLAYBACK);
        
        // Toggle last playing song item
        if(last_playing_item != undefined) {
            last_playing_item.removeClass("songlist__item--playing");
        }
        
        // Set current playing item icon
        current_playing_item.addClass("songlist__item--playing");
    }
    
    // 暂停播放
    function pauseAudio() {
        audio_player_el.pause();
    }
    
    // 开始播放
    function playAudio() {
        loadAudio(current_play_index);
        audio_player_el.play()
        .then(function(e) {
            // 播放成功,清除播放失败变量
            last_play_failed_item = undefined;
        }).catch(function(e) {
            if(last_play_failed_item == undefined) {
                // 播放失败,记下播放失败的item
                last_play_failed_item = current_playing_item;
                switchNextSong();
            } else if(current_playing_item != last_play_failed_item) {// 防止不停循环播放占用CPU
                switchNextSong();
            }
        });
    }
    
    // 下一曲
    function _nextSong() {
        if(play_mode == PLAY_MODE_RECYCLE) {
            // Recycle
            incCurrentIndex(1);
            playAudio();
        } else if(play_mode == PLAY_MODE_RANDOM) {
            // Random 
            current_play_index = parseInt(Math.random() * song_box.children().length);
            playAudio();
        }
    }
    
    // 切换下一曲
    function switchNextSong() {
        debounce(_nextSong, 1000);
    }
    
    // 获取当前播放的音频项目
    function getCurrentSongItem() {
        song_items = $(".songlist__songname_txt");
        if(current_play_index<0 || current_play_index>=song_items.length)
            return;
        return $(song_items[current_play_index]);
    }
    
    // 更新进度条
    function updateProgressBar() {
        // 将当前播放的时长与总时长转换成时间格式后更新到界面上
        time_duration.html(secondsToTimeStr(audio_player_el.currentTime) + " / " + secondsToTimeStr(audio_player_el.duration));
        
        // 更新当前播放进度条
        current_progress_bar.css("width", audio_player_el.currentTime*100/audio_player_el.duration+"%");
    }
    
    // 处理音频播放事件
    audio_player.on({
        timeupdate: throttle(updateProgressBar, 300),
        ratechange: function() {
            $(".txp_current").removeClass("txp_current");
            $(".txp_menuitem").each(function() {
                var self = $(this);
                if(getPlaybackRateFromString(self.text()) == audio_player_el.playbackRate) {
                    self.addClass("txp_current");
                    return false;
                }
            });
        },
        ended: switchNextSong,
        playing: function() {
            storage.removeItem("index");
            storage.setItem("index",JSON.stringify(current_play_index));
            btn_play.addClass("btn_big_play--pause");  
            
            // Toggle last playing song item
            if(last_playing_item != undefined) {
                last_playing_item.find(".list_menu__icon_pause").attr("class", "list_menu__icon_play");
            }
             // Set current playing item icon
            current_playing_item.find(".list_menu__icon_play").attr("class", "list_menu__icon_pause");
            
            // Set song title
            var current_song_name = current_playing_item.find(".songlist__songname_txt").attr("title");
            song_title.text(current_song_name);
            song_title.attr("title", current_song_name);
            $(".js_singer").text("Bilge Theall");
        },
        pause: function() {
            btn_play.removeClass("btn_big_play--pause");
            $(".list_menu__icon_pause").attr("class", "list_menu__icon_play");
        },
        progress: function() {
            if(this.buffered.length > 0) {
                progress_width = parseInt(100 * this.buffered.end(this.buffered.length-1) / audio_player_el.duration, 10);
                current_download_bar.css("width", progress_width+"%");
            }
        }
    });
    
    // 播放按钮的点击事件
    btn_play.click(function() {
        need_play = audio_player_el.paused;
        if(need_play) {
            playAudio();
        } else {
           audio_player_el.pause();
        }
    });

    // 增加当前播放索引
    function incCurrentIndex(index) {    
        current_play_index += index;
        if(current_play_index<0 || current_play_index>=song_box.children().length)
            current_play_index = 0;
    }
    
    // 上一曲
    $(".btn_big_prev").click(function() {
       if(play_mode == PLAY_MODE_RECYCLE) {
           // Recycle
           incCurrentIndex(-1);
           playAudio();
       } else if(play_mode == PLAY_MODE_RANDOM) {
           // Random 
           current_play_index = parseInt(Math.random() * song_box.children().length);
           playAudio();
       }
    });
    // 下一曲
    $(".btn_big_next").click(function() {
       _nextSong();
    });
    
    // Playing progress bar
    $("#progress,#downloadbar,#spanplayer_bgbar").click(function(event){
        let seeking_time = ((event.pageX - progress_bar_base.offset().left) / progress_bar_base.width()) * audio_player_el.duration;
        let seekable = false;
        for(let i=0;i<audio_player_el.seekable.length;i++) {
            if(seeking_time>=audio_player_el.seekable.start(i) && seeking_time<=audio_player_el.seekable.end(i)) {
                audio_player_el.currentTime = seeking_time;
                seekable = true;
                break;
            }
        }
        if(!seekable && audio_player_el.buffered.length>0) {
            audio_player_el.currentTime = audio_player_el.buffered.end(audio_player_el.buffered.length-1);
        }
        return false;
    });
    
    // Query music list from Everything
    function querySongs(query) {
        let items = [];
        resultMap = getList(query);
        
        for(key in resultMap) {
            let item = new SongItem(key, resultMap[key]);
            items.push(item);
        }
        return items;
    }
    
    // 保存歌曲
    function save(){
        song_container.save();
    }
    
    // 窗口关闭事件
    window.onbeforeunload = function() {
        save();
        saveConfig();
    }
       
    // Muted button
    function mutePlayer(muted) {
        if(typeof(muted) != 'boolean')
            return false;
        
        if(audio_player_el.muted == muted)
            return false;
        
        audio_player_el.muted = muted;
        if(muted) {
            btnVoice.addClass("btn_big_voice--no");
            btnVoice.attr("title", "打开声音[M]");
        } else {
            btnVoice.removeClass("btn_big_voice--no");
            btnVoice.attr("title", "关闭声音[M]");
        }
        return true;
    }
    
    // 音量大小按钮
    btnVoice.click(function() {
        muted = audio_player[0].muted;
        muted = !muted;
        if(mutePlayer(muted))
            setParameter(CFG_MUTED, muted);
    });
    
    // Change volume
    function changeVolume(val) {
        if(val==undefined || isNaN(val) || val<0 || val>100)
            return false;
        
        if(audio_player_el.volume*100 == val)
            return false;
        
        // set volume to audio player
        audio_player_el.volume = val/100;
        volume_progress.css("width", val+"%");
        return true;
    }
    
    function volumeSlideTo(x) {
        val = parseInt(100 * (x - volume_progress.offset().left) / volume_progress.parent().width(), 10);
        if(changeVolume(val))
            setParameter(CFG_VOLUME, val);
    }
    // 音量滑块点击事件
    $("#voice").click(function(event) {
        volumeSlideTo(event.pageX);
    });
    // 音量滑块拖动
    $("#voice").mousemove(function(event) {
        if(event.buttons==0) // No button is down
            return true;
        volumeSlideTo(event.pageX);
        return false;
    });

    // 获取歌曲
    function fetchSongs(query_string) {
        let items = querySongs(query_string);
        
        // 添加到container
        for(let i=0;i<items.length;i++)
            song_container.add(items[i]);
    }
    
    //批量选择删除
    $(".js_all_delete").click(function(){
        song_container.removeSelectedItems();
    })
    
    //清空列表
    $(".js_all_deleted").click(function(){
        song_container.clear();
        song_box.empty();
        audio_player.attr("src", null);
        btn_play.removeClass("btn_big_play--pause");
        song_title.text("暂无歌曲");
        song_title.attr("title", "");
        $(".js_singer").text("");
        current_progress_bar.css("width","0px");
        time_duration.html("00:00 / 00:00");
        current_play_index = 0;
        name.length = 0;
        url.length = 0;;
    })
    
    //批量下载
    $(".js_all_down").click(function(){
        
    })
    
    //底部下载
    $(".btn_big_down").click(function(){
        
    })
    
    // 倍速
    function getPlaybackRateFromString(s) {
        return parseFloat(s.substr(0, s.length-1));
    }
    $(".txp_menuitem").click(function() {
        var self = $(this);
        if(self.hasClass("txp_current"))
            return;
        
        audio_player_el.playbackRate = getPlaybackRateFromString(self.text());
        setParameter(CFG_PLAYBACK, audio_player_el.playbackRate);
    });
    $(".txp_popup_definition").mouseleave(function() {
        $(this).hide();
    });
    $("#btn_playback_rate").click(function() {
        $(".txp_popup_definition").toggle();
    });
    
    // 播放模式
    function updatePlayModeUI() {
        if(play_mode == PLAY_MODE_SINGLE) {
            // Single
            btn_play_mode.attr("class", "btn_big_style_single");
            btn_play_mode.attr("title", "单曲循环[O]");
            btn_play_mode.children().first().text("单曲循环[O]");
        } else if(play_mode == PLAY_MODE_RECYCLE) {
            // Recycle 
            btn_play_mode.attr("class", "btn_big_style_list");
            btn_play_mode.attr("title", "列表循环[O]");
            btn_play_mode.children().first().text("列表循环[O]");
        } else if(play_mode == PLAY_MODE_RANDOM) {
            // Random 
            btn_play_mode.attr("class", "btn_big_style_random");
            btn_play_mode.attr("title", "随机播放[O]");
            btn_play_mode.children().first().text("随机播放[O]");
        }
    }
    
    // 设置播放模式，同时更新界面
    function setPlayMode(mode) {
        if(play_mode == mode)
            return;
        
        play_mode = mode;
        audio_player_el.loop = play_mode == PLAY_MODE_SINGLE;
        updatePlayModeUI();
    }
    
    // 点击播放按钮
    btn_play_mode.click(function() {
        var self = $(this);
        let current_mode = play_mode;
        current_mode++;
        if(current_mode > PLAY_MODE_RANDOM)
            current_mode = PLAY_MODE_SINGLE;
        
        setPlayMode(current_mode);
        setParameter(CFG_PLAY_MODE, play_mode);
    });
    
    function setViewMode(simple) {
        if(simple) {
            btn_simple_view_on.hide();
            btn_simple_view_off.show();
            view_normal.hide();
            view_clean.show();
        } else {
            btn_simple_view_on.show();
            btn_simple_view_off.hide();
            view_normal.show();
            view_clean.hide();
        }
    }
    
    //打开纯净模式
    btn_simple_view_on.click(function(){
        setViewMode(true);
        setParameter(CFG_SIMPLE_VIEW, true);
    });
    //关闭纯净模式
    btn_simple_view_off.click(function(){
        setViewMode(false);
        setParameter(CFG_SIMPLE_VIEW, false);
    });
    
    // 标题滚动
    function getPlayingSongTitle() {
        var _temp_str = '';
        if(current_playing_item != undefined)
            _temp_str = current_playing_item.find(".songlist__songname_txt").attr("title");
        return _temp_str;
    }
    
    // 搜索
    $("#search_songs").submit(function(e) {
        e.preventDefault();
        var _s = $("#search-sug-input").val();
        _s = _s.trimLeft();
        if(_s.startsWith('\\')) {
            // 搜索专辑
            _s = '*.mp3 "' + _s + '"';
        } else {
            _s = '"*' + _s + '*.mp3"';
        }
        fetchSongs(_s);
    });
    
    // 从local storage加载设置
    function loadConfig() {
        var DEFAULT_CONFIG = {};
        DEFAULT_CONFIG[CFG_MUTED] = false;
        DEFAULT_CONFIG[CFG_VOLUME] = 100;
        DEFAULT_CONFIG[CFG_PLAYBACK] = 1;
        DEFAULT_CONFIG[CFG_SIMPLE_VIEW] = false;
        DEFAULT_CONFIG[CFG_PLAY_MODE] = PLAY_MODE_RECYCLE;
        
        config_local = JSON.parse(storage.getItem(CFG_KEY))||DEFAULT_CONFIG;
        mutePlayer(config_local[CFG_MUTED]);
        changeVolume(config_local[CFG_VOLUME]);
        setViewMode(config_local[CFG_SIMPLE_VIEW]);
        setPlayMode(config_local[CFG_PLAY_MODE]);
    }
    
    // 读取配置参数
    function getParameter(key) {
        return config_local[key];
    }
    
    // 设置配置参数
    function setParameter(key, value) {
        if(config_local == undefined)
            return;
        
        if(config_local[key] == value)
            return;
        
        config_local[key] = value;
        config_dirty = true;
    }
    
    // 保存配置到local storage
    function saveConfig() {
        if(!config_dirty)
            return;
        
        storage.setItem(CFG_KEY,JSON.stringify(config_local));
    }
    
    // 循环滚动标题
    function scrollTitle() {
        var _temp_str = getPlayingSongTitle() + "...正在播放 ";
        title_scroll_index = title_scroll_index + 1;
        if(title_scroll_index >= _temp_str.length)
            title_scroll_index = 0;
        _temp_str = _temp_str.substr(title_scroll_index, _temp_str.length-1) + _temp_str.substr(0, title_scroll_index);
        title.text(_temp_str);
    }
    
    // Song item's play button
    function isItemPlaying(item) {
        return current_playing_item==item || (current_playing_item.length==item.length && item.length==1 && current_playing_item[0]==item[0]);
    }
    
    //play or pauser
    function onSongItemPlayButtonClicked() {
        var thisItem = $(this).parents("div .songlist__item");
        // Current playing is not me
        try {
            if(!isItemPlaying(thisItem))
                loadAudio(thisItem);
        } catch(e) {
            current_play_index=$(".list_menu__play").index(this);    
            audio_player_el.play();
        }
        if(audio_player_el.paused) {
            // Play this item
            playAudio();
        } else {
            pauseAudio();
        }
    }
    
    //删除
    function onSongItemDeleteButtonClicked() {
        let _index = $(this).parents('li').index();
        song_container.remove(_index);
    }

    //下载
    function onSongItemDownloadButtonClicked() {
        let _index = $(this).parents('li').index();
        let item = song_container.getItem(_index);
        window.location = item.src;
    }
    
    function onSongItemAdded(items, indexList) {
        for(let i=0;i<items.length;i++) {
            let item = items[i];
            let itemUI = new SongItemUI(item);
            itemUI.setNumber(indexList[i]+1);
            
            // 事件绑定
            // 播放按钮
            itemUI.bindPlayClicked(onSongItemPlayButtonClicked);
            
            // 删除按钮
            itemUI.bindDeleteClicked(onSongItemRemoved);
            
            // 选中按钮
            itemUI.bindCheckBoxClicked(onSongItemCheckButtonClicked);
            
            // 下载按钮
            itemUI.bindDownloadClicked(onSongItemDownloadButtonClicked);
            
            let jqItemUI = itemUI.getJqObject();
            song_box.append(jqItemUI);
            song_item_ui_list.push(itemUI);
        }
    }
    
    // item删除事件通知，items：item列表, indexList: 索引列表
    function onSongItemRemoved(items, indexList) {
        // 根据items或者indexList找相应的html元素，然后删除
        for(let i=indexList.length-1;i>=0;i--) {
            song_box.children().eq(indexList[i]).remove();
            song_item_ui_list.splice(indexList[i], 1);
        }
    }
    
    // item界面选中事件
    function onSongItemCheckButtonClicked() {
        let index = $(this).parents("li").index();
        song_container.setChecked(index, this.checked);
    }
    
    // item选中状态改变
    function onItemCheckChanged(item, checked) {
        let index = song_container.indexOf(item);
        song_item_ui_list[index].setChecked(checked);
    }
    
    // 全选按钮
    $(".js_check_all").click(function() {
        if(this.checked) {
            song_container.selectAll();
        } else {
            song_container.unSelectAll();
        }
    });
    
    function start() {
        loadConfig();
        
        setIcon('favicon.ico');// 设置应用图标
        
        // 绑定事件
        song_container.onItemAdded = onSongItemAdded;
        song_container.onItemRemoved = onSongItemRemoved;
        song_container.onItemCheckChanged = onItemCheckChanged;
        
        // 加载音频
        song_container.load();
        
        setInterval(save, 100000);
        setInterval(scrollTitle, 1000);
        btn_play.click();
    }
    
    start();
});