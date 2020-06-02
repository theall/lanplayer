$(function(){
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
    var audio_playback_rate = 1;// 回放速度
    var btn_play = $("#btnplay");// 播放按钮对象
    var progress_bar_base = $("#spanplayer_bgbar");// 播放器进度条父对象
    var current_progress_bar = $("#spanplaybar");// 当前播放进度条
    var song_title = $("#sim_song_info>a:first");// 当前播放音乐的标题对象
    var song_author = song_title.next();// 当前播放音乐的作者
    const PLAY_MODE_SINGLE = 1;// 播放模式：单个循环
    const PLAY_MODE_RECYCLE = 2;// 播放模式：列表循环
    const PLAY_MODE_RANDOM = 3;// 播放模式：随机循环
    var play_mode = PLAY_MODE_RECYCLE;// 记录当前播放模式
    var debounce_timer = false;// 防抖定时器
    var storage = window.localStorage;// 本机存储对象
    
    setIcon('favicon.ico');// 设置应用图标
    
    // 设置图标
    // icon 图标的url
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
        
        // Toggle last playing song item
        if(last_playing_item != undefined) {
            last_playing_item.removeClass("songlist__item--playing");
            }
        // Set current playing item icon
        current_playing_item.addClass("songlist__item--playing");
    }
    
    var tirm = undefined;
    function pauseAudio() {
        clearTimeout(tirm);
        audio_player_el.pause();
    }
    
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
        current_progress_bar.css("width", parseInt(audio_player_el.currentTime*100/audio_player_el.duration, 10)+"%");
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
        if(current_play_index<0 || current_play_index>=song_box.children().length)
            current_play_index = 0;
    }
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
    $(".btn_big_next").click(function() {
       _nextSong();
    });
    
    // Playing progress bar
    $("#progress,#downloadbar,#spanplayer_bgbar").click(function(event){
        progress_width = parseInt(100 * (event.pageX - progress_bar_base.offset().left) / progress_bar_base.width(), 10);
        current_progress_bar.css("width", progress_width+"%");
        return false;
    });
    
    var name=[],url=[],resultMap;
    // Load music list
    function querySongs(query) {
        if(storage.getItem("jihe")!=null){    
                resultMap=JSON.parse(storage.getItem("jihe"));
                current_play_index=JSON.parse(storage.getItem("index"));
        }else{
                resultMap = getList(query);    
        }
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
            url[_index]=resultMap[key];
            name[_index]=key;
            _el.find(".songlist__number").html(_index+"");
            song_box.append(_el);
            _index++;
        }
    }
    
    //保存歌曲列表
    function localStorage(){
        var jihe={};
        if(url.length!=0){
            for(var i in url){
                jihe[name[i]]=url[i];
            }
            storage.setItem("jihe",JSON.stringify(jihe));
        }
    }

    function baocun(){
        var jihe={};
        if(storage.getItem("jihe")!=null){    
        var url_a=[],name_a=[];
        var index_=1;
        for(key in resultMap){
            url_a[index_]=resultMap[key];
            name_a[index_]=key;
            index_++;
        }
        if(url_a.length!=url.length){
            storage.removeItem("jihe");
            for(var i in name){
                jihe[name[i]]=url[i];
            }
            storage.setItem("jihe",JSON.stringify(jihe));
        }
        }
    }
    setInterval(baocun,100000);
    
    window.onbeforeunload=function(){
       baocun();
    }
       
    // Muted button
    var btnVoice = $(".btn_big_voice");
    function mutePlayer(muted) {
        audio_player_el.muted = muted;
        if(muted) {
            btnVoice.addClass("btn_big_voice--no");
            btnVoice.attr("title", "打开声音[M]");
            storage.setItem("muted",JSON.stringify(muted));
        } else {
            btnVoice.removeClass("btn_big_voice--no");
            btnVoice.attr("title", "关闭声音[M]");
            storage.setItem("muted",JSON.stringify(muted));
        }
    }
    btnVoice.click(function() {
        muted = audio_player[0].muted;
        muted = !muted;
        mutePlayer(muted);
    });
    if(JSON.parse(storage.getItem("muted"))!=null&&JSON.parse(storage.getItem("muted"))!=undefined)
    mutePlayer(JSON.parse(storage.getItem("muted")));
    
    // Change volume
    var volume_progress = $("#spanvolumebar");//volume bar
    function changeVolume(val) {
        if(val==undefined || isNaN(val) || val<0 || val>100)
            return;
        
        // set volume to audio player
        audio_player_el.volume = val/100;
        volume_progress.css("width", val+"%");
        //保存音量
        storage.removeItem("volume");
        storage.setItem("volume",JSON.stringify(val));
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
    if(JSON.parse(storage.getItem("volume"))!=null&&JSON.parse(storage.getItem("volume"))!=undefined)
    changeVolume(JSON.parse(storage.getItem("volume")));

    function fetchSongs(query_string) {
        querySongs(query_string);
        // Song item's play button
        function isItemPlaying(item) {
            return current_playing_item==item || (current_playing_item.length==item.length && item.length==1 && current_playing_item[0]==item[0]);
        }
        //play or pauser
        $(".list_menu__play").click(function() {
            var thisItem = $(this).parents("div .songlist__item");
            // Current playing is not me
            try{
                if(!isItemPlaying(thisItem))
                loadAudio(thisItem);
            }catch(e){
                current_play_index=$(".list_menu__play").index(this);    
                audio_player_el.play();
            }
            if(audio_player_el.paused) {
                // Play this item
                playAudio();
            } else {
                pauseAudio();
            }
        });
        //删除
        $(".songlist__delete").click(function(){
            var in_dex = $(".songlist__delete").index(this);
            $(this).parent().parent().remove();
            delete_update(in_dex);
        });
        //选中处理
        $(".songlist__checkbox").click(function(){
            var in_dex = $(".songlist__checkbox").index(this);
            var check = $(this).attr("checked");
            if(!check){    
                if(in_dex==0){
                    $(".songlist__checkbox").attr("checked",false);
                }else{
                    $(".songlist__checkbox").eq(0).attr("checked",false);
                    $(this).attr("checked",false);
                }
            }else{    
                if(in_dex==0){
                    $(".songlist__checkbox").attr("checked",true);
                }else{
                    $(this).attr("checked",true);
                    if($(" .songlist__edit :checked").length==$(".songlist__checkbox").length-1){
                        $(".songlist__checkbox").eq(0).attr("checked",true);
                    }
                }
            }
        })
        //下载
        $(".list_menu__down").click(function(){
            menu__down();
        })
    }
    
    //批量选择删除
    var Pd=false;
    $(".js_all_delete").click(function(){
        var delet_jilu=[];
        var checked=$(" .songlist__edit :checked");
        if($(".songlist__checkbox").eq(0).prop("checked")==true){
            checked=$(" .songlist__edit :checked:gt(0)");
            $(".songlist__checkbox").eq(0).attr("checked",false);
        }
        for(var i=1;i<$(".songlist__checkbox").length;i++){
            if($(".songlist__checkbox").eq(i).prop("checked")==true){
                delet_jilu.push(i);
            }
        }
        var indexx = 0;
        checked.each(function(){
            Pd = true;
            delete_update(delet_jilu[indexx]-(indexx+1));    
            indexx++;
            $(this).parent().parent().remove();
        })
    })
    
    //删除后更新
    function delete_update(index){
        for(var i = 0 ; i < song_box.children("li").length+1;i++){
            $(".songlist__number").eq(i-1).html(i+"");
        }
        name.splice(index+1,1);
        url.splice(index+1,1);
        if(current_play_index==index){
            if(Pd==true){
            current_play_index++;
            Pd=false;
            }
            if(!audio_player_el.paused)
                playAudio();
            else{
                trim=setTimeout(function(){playAudio();setTimeout(pauseAudio(),100)},400);
                loadAudio(current_play_index);
                pauseAudio(); 
            }
        }else{
            if(current_play_index!=0&&current_play_index>index){
                current_play_index--;
            }
        }
        if($(".songlist__item").length==1){
            $(".js_all_deleted").click();
        }
    }
    
    //清空列表
    $(".js_all_deleted").click(function(){
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
        menu__down();
    })
    
    //底部下载
    $(".btn_big_down").click(function(){
        menu__down();
    })
    
    //下载处理
    function menu__down(){
        alert("下载成功");
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
    
    //打开纯净模式
    $("#simp_btn").click(function(){
        $("#simp_btn").hide();
        $("#off_btn").show();
        $(".player_style_normal").hide();
        $(".player_style_only").show();
    });
    //关闭纯净模式
    $("#off_btn").click(function(){
        $("#simp_btn").show();
        $("#off_btn").hide();
        $(".player_style_normal").show();
        $(".player_style_only").hide();
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
        current_play_index = 0;
        storage.removeItem("index");
        storage.setItem("index",JSON.stringify(current_play_index));
        storage.removeItem("jihe");
        e.preventDefault();
        var _s = $("#search-sug-input").val();
        fetchSongs("*" + _s + "*.mp3");
        localStorage();    
    });
    fetchSongs("*test*.mp3");
    btn_play.click();
});