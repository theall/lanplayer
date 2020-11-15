const MUSIC_KEY = 'musics';

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
    if(index==undefined || index<0)
        index = 0;
    if(index > this.items.length)
        index = this.items.length;
    this.items.splice(index, 0, item);
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
    for(let i=items.length-1;i>=0;i--) {
        this.add(new SongItem(items[i]), i);
    }
    this.dirty = false;
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