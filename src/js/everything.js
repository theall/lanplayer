function extractNamesRe(res) {
    var results = {};
    var pattern = /<a href=\"([^\s]+\.nes)\">([^<]+)\.nes<\/a>/g
    do{
        var match = pattern.exec(res);
        if(match == null) 
            break;
        if(match.length != 3)
            continue;
        results[match[2]] = match[1];
    } while(1)
    return results;
}

function extractNamesJquery(res) {
    var results = {};
    var temp_div = $(res);
    temp_div.find(".maintable tr td:nth-child(2n+1) a:nth-child(2n)").each(function() {
        results[$(this).text()] = $(this).attr("href");
    });
    return results;
}

function absolutePathToUrl(path, fileName) {
    path = path.replace(/\\/g, "/");
    path_array = path.split('/');
    path_array.push(fileName);
    for(var i=0;i<path_array.length;i++) {
        path_array[i] = encodeURIComponent(path_array[i]);
    }
    path_array.unshift("");
    path = path_array.join('/');
    return path;
}

function extractBaseName(fileName) {
    var i = fileName.lastIndexOf(".");
    if(i != -1)
        fileName = fileName.substr(0, i);
    return fileName;
}

function extractNamesFromJson(res) {
    var ret = {};
    res = JSON.parse(res);
    res.results.forEach(function(el) {
        var fileName = el["name"];
        var baseName = extractBaseName(fileName);
        ret[baseName] = absolutePathToUrl(el["path"], fileName); 
    });
    return ret;
}

function getList(param, callback) {
    if(param != undefined)
        param = encodeURIComponent(param);
    var queryUrl = '/?s=' + param + "&j=1&path_column=1";
    var self = this;
    self.param = param;
    if(callback != undefined) {
        $.ajax({
            url: queryUrl,
            async: true,
            success: function() {
                callback(extractNamesFromJson(response.responseText));
            },
            error: function() {
                console.log("Error in querying: " + self.param);
            }
        });
    } else {
        var response = $.ajax({
            url: "/", 
            data: {"s":param, "j":1, "path_column":1},
            async:false});
        return extractNamesFromJson(response.responseText);
    }
    return {};
}