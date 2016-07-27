if(typeof __require__ == 'undefined'){
    var __require__ = {
        requireArray:[],
        config: function(param){
            this.requireArray.push(param)
        }
    }
}
var lsrequire = (function(){
    if(typeof requireConfig == 'undefined'){
        requireConfig = {
            baseUrl: '',
            version: '',
            deps: {},
        }
        __require__.requireArray.forEach(function(config,idx){
            requireConfig.baseUrl = config.baseUrl || requireConfig.baseUrl
            requireConfig.version = config.version || requireConfig.version
            if(config.deps){
                for(var key in config.deps){
                    requireConfig.deps[key] = config.deps[key]
                }
            }
        })
    }
    if(typeof requireConfig != 'undefined'){
        var deps = requireConfig.deps;
        var revs;
        var injectQueue = [];
        var replaceRev = function(filename){
            if(filename.match(/\.css\.js$/)){
                return filename.replace(/\.css\.js$/,'.'+deps[file]+'.css.js');
            }else{
                return filename.replace(/\.js$/,'.'+deps[file]+'.js');
            }
        }
        var injectList = [];
        var download = function(){
            var baseUrl = requireConfig.baseUrl
            var downloadQueue = []
            for(var file in deps){
                downloadQueue.push({
                    'filename': file,
                    'path': replaceRev(file),
                    'type': 'download'
                })
            }
            var url = baseUrl + '/??'
            downloadQueue.forEach(function(inject){
                if(inject.type == 'download'){
                    url += inject.path+',';
                }
            });
            url = url.replace(/\,$/,'');
            //下载脚本
            if(url != baseUrl + '/??'){
                var script = document.createElement('script');
                script.src = url;
                document.body.appendChild(script);
            }
        }
        var injectForOnlyDownload = function(file){
            if(file.type == 'css'){
                var script = '!(function(){'
                            + '     var style = document.createElement("style");'
                            + '     style.rel = "stylesheet";'
                            + '     style.type = "text/css";'
                            + '     style.id = "'+file.filename.replace(/\//g,'-').replace('.css','').replace('.js','')+'";'
                            + '     style.innerHTML = "'+file.code.replace(/\"/g,'\'')+'";'
                            + '     document.head.appendChild(style);'
                            + '})();'
                eval(script);
            }else{
                eval(file.code +'//@ sourceURL='+file.filename);
            }
        }
        if(!window.localStorage){
            download()
            return {
                inject: injectForOnlyDownload
            }
        }
        var ls = localStorage;
        //fix history
        if(ls['gomeCache-index']){
            ls.removeItem('gomeCache-index')
        }
        if(ls['gomeCache-zepto']){
            ls.removeItem('gomeCache-zepto')
        }

        if(ls['ls~revs']){
            revs= JSON.parse(ls['ls~revs']);
        }else{
            revs = {};
        }
        //版本有变化的列表
        var diffs = {};
        for(var file in deps){
            //检测版本号
            if(revs[file]){
                if(revs[file] != deps[file]){
                    revs[file] = deps[file];
                    diffs[file] = true;
                }
            }else{
                revs[file] = deps[file];
            }
            //生成输入队列
            if(deps[file] == revs[file] && ls['ls~'+file] && !diffs[file]){
                //不需要加载
                injectQueue.push({
                    'filename': file,
                    'path': replaceRev(file),
                    'type': 'inject'
                });
            }else{
                injectQueue.push({
                    'filename': file,
                    'path': replaceRev(file),
                    'type': 'download'
                });
            }
        }
        try{
            ls['ls~revs'] = JSON.stringify(revs);
        }catch(e){
            download()
            return {
                inject: injectForOnlyDownload
            }
        }
        //检测可以先插入的脚本，则先插入，然后弹出队列
        var injectRecursion = function(){
            if(injectQueue.length == 0)return;
            if(injectQueue[0].type == 'inject'){
                if(injectQueue[0].filename.match(/\.css\.js$/)){
                    eval(ls['ls~'+injectQueue[0].filename]);
                }else{
                    eval(ls['ls~'+injectQueue[0].filename] +'//@ sourceURL='+injectQueue[0].filename);
                    //var script = document.createElement('script');
                    //script.type = "text/javascript";
                    //script.id = injectQueue[0].filename.replace(/\.js$/,'').replace(/\//,'-');
                    //script.innerHTML = ls['ls~'+injectQueue[0].filename];
                    //script.src = 'data:text/javascript;charset=utf-8,'+escape(ls['ls~'+injectQueue[0].filename]+'//@sourceURL='+file.filename);
                    //document.body.appendChild(script);
                }
                //document.write('<script id="'+injectQueue[0].file.replace(/\.js$/,'').replace(/\//,'-')+'">'+ ls['ls~'+injectQueue[0].file] +'</script>');
                injectQueue.shift();
                injectRecursion();
            }
        }
        injectRecursion();
        //建立下载链接
        var url = requireConfig.baseUrl + '/??'
        injectQueue.forEach(function(inject){
            if(inject.type == 'download'){
                url += inject.path+',';
            }
        });
        url = url.replace(/\,$/,'');
        //下载脚本
        if(url != requireConfig.baseUrl + '/??')
            document.write('<script src="'+url+'"></script>');
        return {
            //脚本调用的，注入方法
            inject: function(file){
                //注入脚本
                //console.log(file)
                if(file.type == 'css'){
                    var script = '!(function(){'
                                + '     var style = document.createElement("style");'
                                + '     style.rel = "stylesheet";'
                                + '     style.type = "text/css";'
                                + '     style.id = "'+file.filename.replace(/\//g,'-').replace('.css','').replace('.js','')+'";'
                                + '     style.innerHTML = "'+file.code.replace(/\"/g,'\'')+'";'
                                + '     document.head.appendChild(style);'
                                + '})();'
                    eval(script);
                    ls['ls~'+file.filename] = script;
                }else{
                    eval(file.code +'//@ sourceURL='+file.filename);
                    ls['ls~'+file.filename] = file.code;
                }
                injectQueue.shift();
                //检测不需要加载的，直接注入
                injectRecursion();
            }
        }
    }
})();
