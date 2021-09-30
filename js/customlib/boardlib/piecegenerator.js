class PieceGenerator {
    constructor(id, basewidth, baseheight, newpiececost, upgradecosts, upgrademaxes, minfuncs, maxfuncs, buykey) {
        this.id = id;
        this.newpiececost = newpiececost;
        this.boughtpieces = 0;
        this.upgradecosts = upgradecosts;
        this.upgrademaxes = upgrademaxes;
        this.minfuncs = minfuncs;
        this.maxfuncs = maxfuncs;
        this.upgradelevels = { "width": new Decimal(basewidth), "height": new Decimal(baseheight), "effectmax": new Decimal(1) };
        for (var i = 0; i < this.minfuncs.length; i++) {
            this.upgradelevels["min" + i] = new Decimal();
            this.upgradelevels["max" + i] = new Decimal();
        }
        this.buykey = buykey;

        updaterequiredregistry.push(this)
        this.a = 0;
    }

    tick() {
        this.updatepiececost();
        this.a = (this.a + 1) % 10
    }

    getupgradelevel(type) {
        var ind = parseInt(type.slice(3));
        if (type.includes("min"))
            return this.getmincapped(ind) ? formatDecimalOverride(this.getminvalue(ind), 2) + "(" + formatDecimalOverride(this.getuncappedminvalue(ind), 2) + ")" : formatDecimalOverride(this.getminvalue(ind), 2);
        if (type.includes("max") && !type.includes("effect"))
            return formatDecimalOverride(this.getmaxvalue(ind), 2);
        if (this.upgradelevels[type] != undefined)
            return formatDecimalNormal(this.upgradelevels[type]);
    }

    getmincapped(ind) {
        return this.getuncappedminvalue(ind) > this.getmaxvalue(ind);
    }

    getminvalue(ind) {
        var max = this.getmaxvalue(ind);
        var min = this.getuncappedminvalue(ind);
        if (min > max)
            return max;
        return min;
    }

    getuncappedminvalue(ind) {
        return this.minfuncs[ind](this.upgradelevels["min" + ind]);
    }

    getmaxvalue(ind) {
        return this.maxfuncs[ind](this.upgradelevels["max" + ind])
    }

    get types() {
        var out = [];
        for (let [key, value] of Object.entries(this.upgradelevels)) {
            out.push(key);
        }
        return out;
    }

    buyupgrade(type) {
        if (this.canbuyupgrade(type)) {
            this.upgradelevels[type] = this.upgradelevels[type].add(this.buyamount(type));
            this.upgradecosts[type].subtractcost();
            this.updateupgradecosts();
        }
    }

    getupgradecost(type) {
        if (this.upgradecosts[type] != undefined){
            if(this.upgrademaxes[type] != undefined && this.ismaxbuyable(type))
                return "Maxxed"
            return this.upgradecosts[type].description;
        }
    }

    ismaxbuyable(type){
        return this.upgradelevels[type].greaterThanOrEqualTo(this.upgrademaxes[type]);
    }

    canbuyupgrade(type) {
        return this.upgradecosts[type].hascost;
    }

    updateupgradecosts() {
        console.log(getbuyamount(this.buykey));
        for (let [key, value] of Object.entries(this.upgradelevels)) {
            this.upgradecosts[key].recalculatecost(value, this.buyamount(key))
        }
    }

    buyamount(type) {
        if (player.options.buyamounts[this.buykey] == -1) {
            var max = this.getmaxbuyable(type);
            if (max.lessThanOrEqualTo(new Decimal(0)))
                return new Decimal(1);
            return max;
        }
        return player.options.buyamounts[this.buykey];
    }

    getmaxbuyable(type) {
        var maxamount = this.upgradecosts[type].getmaxbuyable(this.upgradelevels[type]);
        if (this.upgrademaxes != undefined && this.upgrademaxes[type] != undefined && this.upgradelevels[type].add(maxamount).greaterThan(this.upgrademaxes[type])) {
            if (new Decimal(this.upgrademaxes[type]).minus(this.upgradelevels[type]).lessThan(0))
                maxamount = new Decimal();
            else
                maxamount = new Decimal(this.upgrademaxes[type]).minus(this.upgradelevels[type]);
        }
        return maxamount;
    }

    getmaxeffects() {
        return this.upgradelevels["effectmax"];
    }

    getmaxwidth() {
        return this.upgradelevels["width"]
    }

    getmaxheight() {
        return this.upgradelevels["height"]
    }

    buypiece() {
        if (this.newpiececost.hascost) {
            this.boughtpieces += 1;
            this.newpiececost.subtractcost();
            this.updatepiececost();
            return this.generatepiece();
        }
        return undefined;
    }

    get piececost() {
        return this.newpiececost.description;
    }

    updatepiececost() {
        this.newpiececost.recalculatecost(this.boughtpieces, 1)
    }

    getmins() {
        var mins = [];
        for (var i = 0; i < this.minfuncs.length; i++) {
            mins.push(this.minfuncs[i](this.upgradelevels["min" + i]));
        }
        return mins;
    }

    getmaxs() {
        var maxs = [];
        for (var i = 0; i < this.maxfuncs.length; i++) {
            maxs.push(this.maxfuncs[i](this.upgradelevels["max" + i]));
        }
        return maxs;
    }

    generatepiece() {
        var shape = generatepieceshape(1, 1, this.getmaxwidth(), this.getmaxheight());
        var type = generatetype();
        var effectamounts = generateeffectamounts(this.getmaxeffects());
        var effects = {};
        if(effectamounts >= possibleeffects[type].length)
        {
            possibleeffects[type].forEach(elem => {
                effects[elem] = generateweights(this.getmins(), this.getmaxs());
            });
        }else{
            for(var i = 0; i < effectamounts; i++){
                var temp = true
                var count = 0
                while (temp && count  < 1000){
                    var eff = generateeffecttype(type)
                    if(effects[eff] == undefined){
                        effects[eff] = generateweights(this.getmins(), this.getmaxs());
                        temp = false;
                    }
                    count++;
                }
            }
        }
        return new EffectsBoardPiece(shape, type, effects);
    }

    getupgradename(type) {
        if (generatorupgradenames[type] != undefined)
            return generatorupgradenames[type];
        return "No Name"
    }
}
generatorupgradenames = {
    "width": "Maximum Piece Width",
    "height": "Maximum Piece Height",
    "min0": "Weight 1 Minimum Value (Generally Base Value)",
    "min1": "Weight 2 Minimum Value (Generally Multipler to Effect Value)",
    "min2": "Weight 3 Minimum Value (Generally Power to Effect Value)",
    "max0": "Weight 1 Maximum Value (Generally Base Value)",
    "max1": "Weight 2 Maximum Value (Generally Multipler to Effect Value)",
    "max2": "Weight 3 Maximum Value (Generally Power to Effect Value)",
    "effectmax": "Maximum Amount of unique Effects On Each Piece"
}

function setpieceupgradeeffects() {
    possibleeffects = {
        "white": ["neutrongenpow"],//["neutrongenbase", "neutrongenmult", "neutrongenpow"],
        "red": ["protongenbase", "protongenmult", "protongenpow"],
        "orange": ["multorbonus", "acceleronbonus"],
        "yellow": ["electrongainbase", "electrongainmult", "electrongainpow"],
        "green": [""],
        "blue": [""]
    }

    effectfunctions = {
        "neutrongenbase": (blocks, weights, level) => new Decimal(Math.pow(weights[0] * weights[1], weights[2])*Math.pow(1.5, blocks*level)),
        "neutrongenmult": (blocks, weights, level) => new Decimal(1 + Math.pow((weights[0]/10+1) * (weights[1]/100+1), weights[2]/1000 + 1)*Math.pow(1.5, blocks*level)),
        "neutrongenpow": (blocks, weights, level) => new Decimal(Math.pow((weights[0]/100+1) * (weights[1]/1000+1), weights[2]/10000 + 1)*Math.pow(1.01, blocks*level)),
        "protongenbase": (blocks, weights, level) => new Decimal(Math.pow(weights[0] * weights[1], weights[2])*Math.pow(1.5, blocks*level)),
        "protongenmult": (blocks, weights, level) => new Decimal(1 + Math.pow((weights[0]/10+1) * (weights[1]/100+1), weights[2]/1000 + 1)*Math.pow(1.5, blocks*level)),
        "protongenpow": (blocks, weights, level) => new Decimal(Math.pow((weights[0]/100+1) * (weights[1]/1000+1), weights[2]/10000 + 1)*Math.pow(1.01, blocks*level)),
        "multorbonus": (blocks, weights, level) => new Decimal(1 + Math.pow((weights[0]/10+1) * (weights[1]/100+1), weights[2]/1000 + 1)*Math.pow(1.5, blocks*level)),
        "acceleronbonus": (blocks, weights, level) => new Decimal(Math.pow(weights[0] * weights[1], weights[2])*Math.pow(1.5, blocks*level)),
        "electrongainbase": (blocks, weights, level) => new Decimal(Math.pow(weights[0] * weights[1], weights[2])*Math.pow(1.5, blocks*level)),
        "electrongainmult": (blocks, weights, level) => new Decimal(1 + Math.pow((weights[0]/10+1) * (weights[1]/100+1), weights[2]/1000 + 1)*Math.pow(1.5, blocks*level)),
        "electrongainpow": (blocks, weights, level) => new Decimal(Math.pow((weights[0]/100+1) * (weights[1]/1000+1), weights[2]/10000 + 1)*Math.pow(1.01, blocks*level)),
    }
    effectdescriptions = {
        "neutrongenbase": (obj) => "Neutron Generation + " + formatDecimalOverride(obj.value, 2),
        "neutrongenmult": (obj) => "Neutron Generation * " + formatDecimalOverride(obj.value, 2),
        "neutrongenpow": (obj) => "Neutron Generation ^ " + formatDecimalOverride(obj.value, 2),
        "protongenbase": (obj) => "Proton Generation + " + formatDecimalOverride(obj.value, 2),
        "protongenmult": (obj) => "Proton Generation * " + formatDecimalOverride(obj.value, 2),
        "protongenpow": (obj) => "Proton Generation ^ " + formatDecimalOverride(obj.value, 2),
        "multorbonus": (obj) => "Free Multors: " + formatDecimalOverride(obj.value, 2),
        "acceleronbonus": (obj) => "Free Accelerons: " + formatDecimalOverride(obj.value, 2),
        "electrongainbase": (obj) => "Electron Gain + " + formatDecimalOverride(obj.value, 2),
        "electrongainmult": (obj) => "Electron Gain * " + formatDecimalOverride(obj.value, 2),
        "electrongainpow": (obj) => "Electron Gain ^ " + formatDecimalOverride(obj.value, 2)
    }
    effectobjects = {
        "neutrongenbase": () => player.nucleonstage.split.neutrongenerator,
        "neutrongenmult": () => player.nucleonstage.split.neutrongenerator,
        "neutrongenpow": () => player.nucleonstage.split.neutrongenerator,
        "protongenbase": () => player.nucleonstage.split.protongenerator,
        "protongenmult": () => player.nucleonstage.split.protongenerator,
        "protongenpow": () => player.nucleonstage.split.protongenerator,
        "multorbonus": () => getupgrade("qu5"),
        "acceleronbonus": () => getupgrade("qu0"),
        "electrongainbase": () => getprestige("electrify"),
        "electrongainmult": () => getprestige("electrify"),
        "electrongainpow": () => getprestige("electrify")
    }
    effecttypesdef = {
        "neutrongenbase": EffectTypes.ProducerBaseProduction,
        "neutrongenmult": EffectTypes.ProducerMultiplierProduction,
        "neutrongenpow": EffectTypes.ProducerExponentialProduction,
        "protongenbase": EffectTypes.ProducerBaseProduction,
        "protongenmult": EffectTypes.ProducerMultiplierProduction,
        "protongenpow": EffectTypes.ProducerExponentialProduction,
        "multorbonus": EffectTypes.UpgradeBonusLevels,
        "acceleronbonus": EffectTypes.UpgradeBonusLevels,
        "electrongainbase": EffectTypes.PrestigeBaseGain,
        "electrongainmult": EffectTypes.PrestigeMultiplicativeGain,
        "electrongainpow": EffectTypes.PrestigeExponentialGain
    }
}

var effecttypesrandom = new Random(98743567);
function generateeffecttype(type) {
    return possibleeffects[type][effecttypesrandom.nextInt(0, possibleeffects[type].length - 1)];
}

var effectamountrandom = new Random(657493);
function generateeffectamounts(max) {
    return effectamountrandom.nextInt(1, max);
}

var weightsrandom = new Random(18679508);
function generateweights(minweights, maxweights) {
    var weights = [];
    for (var i = 0; i < minweights.length; i++) {
        weights.push(weightsrandom.nextFloat(minweights[i], maxweights[i]));
    }
    return weights;
}


function generatepieceshape(minwidth, minheight, maxwidth, maxheight) {
    var rawshape = generaterawpieceshape(minwidth, minheight, maxwidth, maxheight);
    var shape = cleanshape(rawshape);
    if (shape == undefined)
        return generatepieceshape(minwidth, minheight, maxwidth, maxheight);
    return shape;
}

var pieceshaperan = new Random();
function generaterawpieceshape(minwidth, minheight, maxwidth, maxheight) {
    var width = pieceshaperan.nextInt(minwidth, maxwidth);
    var height = pieceshaperan.nextInt(minheight, maxheight);
    var shape = [];
    for (var y = 0; y < height; y++) {
        var temp = [];
        for (var x = 0; x < width; x++) {
            var ran = pieceshaperan.next()
            if (ran < .8)
                temp.push(1);
            else
                temp.push(0);
        }
        shape.push(temp);
    }
    return shape;
}
function cleanshape(shape) {
    shape = verticalshapecleanup(shape);
    shape = horizontalshapecleanup(shape);
    return shape;
}

function verticalshapecleanup(shape) {
    var inv = [];
    for (var i = 0; i < shape.length; i++) {
        var valid = false;
        shape[i].forEach(elem => {
            if (elem > 0) {
                valid = true;
                return;
            }
        });
        if (!valid)
            inv.push(i);
        else
            break;
    }
    for (var i = shape.length - 1; i > -1; i--) {
        var valid = false;
        shape[i].forEach(elem => {
            if (elem > 0) {
                valid = true;
                return;
            }
        });
        if (!valid)
            inv.push(i);
        else
            break;
    }
    var removed = 0;
    inv.forEach(val => {
        var ind = val - removed;
        shape.splice(ind, 1);
        removed++;
    });
    return shape;
}

function horizontalshapecleanup(shape) {
    if (shape[0] == undefined)
        return undefined;
    var inv = [];
    for (var i = 0; i < shape[0].length; i++) {
        var vd = false;
        for (var t = 0; t < shape.length; t++) {
            if (shape[t][i] > 0) {
                vd = true;
                break;
            }
        }
        if (!vd)
            inv.push(i);
        else
            break;
    }
    for (var i = shape[0].length - 1; i > -1; i--) {
        var vd = false;
        for (var t = 0; t < shape.length; t++) {
            if (shape[t][i] > 0) {
                vd = true;
                break;
            }
        }
        if (!vd)
            inv.push(i);
        else
            break;
    }
    var removed = 0;
    inv.forEach(val => {
        var ind = val - removed;
        for (var id = 0; id < shape.length; id++) {
            shape[id].splice(ind, 1);
        }
        removed++;
    });
    return shape;
}

var possibletype = ["white"]//, "red", "yellow", "orange"];// "blue", "green",
var typeran = new Random();
function generatetype() {
    return possibletype[typeran.nextInt(0, possibletype.length - 1)];
}