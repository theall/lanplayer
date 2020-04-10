$(function(){
    var title = $("title");
    var title_scroll_index = 0;
    var audio_player = $("#h5audio_media");
    var audio_player_el = audio_player[0];
    var song_box = $("#song_box");
    var time_duration = $("#time_show");
    var current_play_index = 0;
    var current_playing_item = undefined;
    var last_playing_item = undefined;
    var audio_playback_rate = 1;
    var btn_play = $("#btnplay");
    var progress_bar_base = $("#spanplayer_bgbar");
    var current_progress_bar = $("#spanplaybar");
    var song_title = $("#sim_song_info>a:first");
    var song_author = song_title.next();
    const PLAY_MODE_SINGLE = 1;
    const PLAY_MODE_RECYCLE = 2;
    const PLAY_MODE_RANDOM = 3;
    var play_mode = PLAY_MODE_RECYCLE;
    
    setIcon('favicon.ico');
    function setIcon(icon) {
        var favicon = document.createElement('link');
        favicon.rel = 'shortcut icon';
        favicon.href = icon;
        favicon.type = 'image/x-icon';
        document.head.append(favicon);
    }
    
    function secondsToTimeStr(secs) {
        if(secs==undefined || isNaN(secs))
            secs = 0;
        var n = parseInt(secs / 60, 10);
        var e = parseInt(secs % 60, 10);
        return (n < 10 ? "0" + n: n) + ":" + (e < 10 ? "0" + e: e)
    }
    
    function throttle(func, delay) {
        var prev = Date.now();
        return function() {
            var context = this;
            var args = arguments;
            var now = Date.now();
            if (now - prev >= delay) {
                func.apply(context, args);
                prev = Date.now();
            }
        }
    }
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
        audio_player_el.playbackRate = audio_playback_rate;
		
    }
    
    function playAudio() {
		loadAudio(current_play_index);
        audio_player_el.play();  
		
    }
    function getCurrentSongItem() {
        song_items = $(".songlist__songname_txt");
        if(current_play_index<0 || current_play_index>=song_items.length)
            return;
        return $(song_items[current_play_index]);
    }
    
    function updateProgressBar() {
        time_duration.html(secondsToTimeStr(audio_player_el.currentTime) + " / " + secondsToTimeStr(audio_player_el.duration));
        current_progress_bar.css("width", parseInt(audio_player_el.currentTime*100/audio_player_el.duration, 10)+"%");
    }
    
    function updateCurrentPlayingItem() {
        
    }
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
        ended: function() {
            if(play_mode == PLAY_MODE_RECYCLE) {
                // Recycle 
				timet=setInterval(delayTrwow,90);
                incCurrentIndex(1);
                playAudio();
            } else if(play_mode == PLAY_MODE_RANDOM) {
                // Random 
                current_play_index = parseInt(Math.random() * song_box.children().length);
                playAudio();
            }
			/*return true;*/
        },
        playing: function() {
            btn_play.addClass("btn_big_play--pause");
            // Toggle last playing song item
            if(last_playing_item != undefined) {
                last_playing_item.removeClass("songlist__item--playing");
                last_playing_item.find(".list_menu__icon_pause").attr("class", "list_menu__icon_play");
            }
            // Set current playing item icon
            current_playing_item.addClass("songlist__item--playing");
            current_playing_item.find(".list_menu__icon_play").attr("class", "list_menu__icon_pause");
            // Set song title
            var current_song_name = current_playing_item.find(".songlist__songname_txt").attr("title");
            song_title.text(current_song_name);
            song_title.attr("title", current_song_name);
        },
        pause: function() {
            btn_play.removeClass("btn_big_play--pause");
            $(".list_menu__icon_pause").attr("class", "list_menu__icon_play");
            $(".songlist__item--playing").removeClass("songlist__item--playing");
        }
    });
    btn_play.click(function() {
        need_play = audio_player_el.paused;
        if(need_play) {
            playAudio();
        } else {
            audio_player_el.pause();
        }
    });
 
    function incCurrentIndex(index) {
        current_play_index += index;
        if(current_play_index < 0)
            current_play_index = 0;
    }
    $(".btn_big_prev").click(function() {
        incCurrentIndex(-1);
        playAudio();
    });
    $(".btn_big_next").click(function() {
		time=setInterval(delayOne,90);/*audio_player_el.duration*100*/
        incCurrentIndex(1);
        playAudio();	
    });
	//添加两个延迟,用时间来判断是否可播放,因为怕切换与循环播放冲突,就分别创建了两个个个一样的方法
function delayOne(){
	 clearInterval(time);
     tt=setInterval(function(){
	if(isNaN(parseInt(audio_player_el.duration))){
	         incCurrentIndex(1);
	           playAudio();	   
		}
		if(!isNaN(parseInt(audio_player_el.duration))){ 
			 clearInterval(tt);
		}
		},100);	 
	}
function delayTrwow(){
	 clearInterval(timet);
	 ttt=setInterval(function(){
	if(isNaN(parseInt(audio_player_el.duration))){
	         incCurrentIndex(1);
	           playAudio();	   
		}
		if(!isNaN(parseInt(audio_player_el.duration))){ 
			 clearInterval(ttt);
		}
		},100);	
	}
    // Playing progress bar
    $("#progress,#downloadbar,#spanplayer_bgbar").click(function(event){
        audio_player_el.current
        progress_width = parseInt(100 * (event.pageX - progress_bar_base.offset().left) / progress_bar_base.width(), 10);
        current_progress_bar.css("width", progress_width+"%");
        return false;
    });
    
    // Load music list
    function querySongs(query) {
        var resultMap = getList(query);
        var tpl = "\
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
        var _index = 1;
        song_box.empty();
        for(var key in resultMap) {
            _el = $(tpl);
            song_name_el = _el.find(".songlist__songname_txt");
            song_name_el.attr("title", key);
            song_name_el.attr("src", resultMap[key]);
            song_name_el.text(key);
            
            _el.find(".songlist__number").html(_index+"");
            song_box.append(_el);
            _index++;
        }
    }
    
    // Muted button
    var btnVoice = $(".btn_big_voice");
    function mutePlayer(muted) {
        audio_player_el.muted = muted;
        if(muted) {
            btnVoice.addClass("btn_big_voice--no");
            btnVoice.attr("title", "打开声音[M]");
        } else {
            btnVoice.removeClass("btn_big_voice--no");
            btnVoice.attr("title", "关闭声音[M]");
        }
    }
    btnVoice.click(function() {
        muted = audio_player[0].muted;
        muted = !muted;
        mutePlayer(muted);
    });
    
    // Change volume
    var volume_progress = $("#spanvolumebar");//volume bar
    function changeVolume(val) {
        if(val==undefined || isNaN(val) || val<0 || val>100)
            return;
        
        // set volume to audio player
        audio_player_el.volume = val/100;
        volume_progress.css("width", val+"%");
    }
    function volumeSlideTo(x) {
        val = parseInt(100 * (x - volume_progress.offset().left) / volume_progress.parent().width(), 10);
        changeVolume(val);
    }
    $("#voice").click(function(event) {
        volumeSlideTo(event.pageX);
    });
    $("#voice").mousemove(function(event) {
        if(event.buttons==0) // No button is down
            return true;
        volumeSlideTo(event.pageX);
        return false;
    });
    
    function fetchSongs(query_string) {
        querySongs(query_string);
        // Song item's play button
        function isItemPlaying(item) {
            return current_playing_item==item || (current_playing_item.length==item.length && item.length==1 && current_playing_item[0]==item[0]);
        }
        $(".list_menu__play").click(function() {
			time=setInterval(delayOne,90);
            var thisItem = $(this).parents("div .songlist__item");
            // Current playing is not me
            if(!isItemPlaying(thisItem))
                loadAudio(thisItem);
            
            if(audio_player_el.paused)
                // Play this item
                audio_player_el.play();
            else
                audio_player_el.pause();
        });
    }
    // 倍速
   function getPlaybackRateFromString(s) {
        return parseFloat(s.substr(0, s.length-1));
    }
    $(".txp_menuitem").click(function() {
        var self = $(this);
        if(self.hasClass("txp_current"))
            return;
        
        audio_playback_rate = getPlaybackRateFromString(self.text());
        audio_player_el.playbackRate = audio_playback_rate;
    });
    $(".txp_popup_definition").mouseleave(function() {
        $(this).hide();
    });
    $("#btn_playback_rate").click(function() {
        $(".txp_popup_definition").toggle();
    });
    
    // 播放模式
    var btn_play_mode = $("#play_mod");
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
    updatePlayModeUI();
    btn_play_mode.click(function() {
        var self = $(this);
        play_mode++;
        if(play_mode > PLAY_MODE_RANDOM)
            play_mode = PLAY_MODE_SINGLE;
        
        audio_player_el.loop = play_mode == PLAY_MODE_SINGLE;
        updatePlayModeUI();
    });
    
    // 标题滚动
    function getPlayingSongTitle() {
        var _temp_str = '';
        if(current_playing_item != undefined)
            _temp_str = current_playing_item.find(".songlist__songname_txt").attr("title");
        return _temp_str;
    }
    setInterval(function() {
        var _temp_str = getPlayingSongTitle() + "...正在播放 ";
        title_scroll_index = title_scroll_index + 1;
        if(title_scroll_index >= _temp_str.length)
            title_scroll_index = 0;
        _temp_str = _temp_str.substr(title_scroll_index, _temp_str.length-1) + _temp_str.substr(0, title_scroll_index);
        title.text(_temp_str);
    }, 1000);
    
    // 搜索
    $("#search_songs").submit(function(e) {
        e.preventDefault();
        var _s = $("#search-sug-input").val();
        fetchSongs("*" + _s + "*.mp3");
    });
    fetchSongs("*metal-max-2-reloaded*.mp3");
    btn_play.click();
});