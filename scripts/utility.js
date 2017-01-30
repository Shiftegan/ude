function mergeDic(dict1, dict2){

    newDict = {}
    for(x of Object.keys(dict1)){
        newDict[x] = dict1[x]
    }
    for(x of Object.keys(dict2)){
        newDict[x] = dict2[x]
    }
    return newDict
}

function nwrap(x, m) {
    while (x < 0) {
        x += m;
    }
    while (x >= m) {
        x -= m;
    }
    return x;
}

function Multifunc() {
    this.array = []
	this.push = function(func) {
    		this.array.push(func)
	}
	this.run = function(on_complete) {
        if (this.array.length == 0) {
            on_complete();
        } else {
            let master = this
            let callback = function() {
                if (master.array.length == 0) {
                    on_complete()
                } else {
                    master.array.shift()(callback)
                }
            }
            this.array.shift()(callback)
        }
    }
}

module.exports = {	Multifunc: Multifunc,
					mergeDic: mergeDic,
					nwrap: nwrap}