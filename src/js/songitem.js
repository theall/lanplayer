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
    
    // event
    if(this.onCheckChanged)
        this.onCheckChanged(this, checked);
}

SongItem.prototype.setDuration = function(duration) {
    if(this.duration == duration)
        return;
    
    this.duration = duration;
    
    // event
    if(this.onDurationChanged)
        this.onDurationChanged(duration);
}