var global = Function('return this;')();
var Symbol = typeof require != 'undefined'
	? require('@riim/symbol-polyfill').Symbol
	: global.Symbol;

var Map = global.Map;

if (!Map || Map.toString().indexOf('[native code]') == -1 || !new Map([[1, 1]]).size) {
	var hasOwn = Object.prototype.hasOwnProperty;

	var KEY_MAP_ID = Symbol('mapId');
	var mapIdCounter = 0;

	var entryStub = {
		value: undefined
	};

	Map = function Map(entries) {
		this._entries = Object.create(null);
		this._objectStamps = {};

		this._first = null;
		this._last = null;

		this.size = 0;

		if (entries) {
			for (var i = 0, l = entries.length; i < l; i++) {
				this.set(entries[i][0], entries[i][1]);
			}
		}
	};

	Map.prototype = {
		constructor: Map,

		has: function(key) {
			return !!this._entries[this._getValueStamp(key)];
		},

		get: function(key) {
			return (this._entries[this._getValueStamp(key)] || entryStub).value;
		},

		set: function(key, value) {
			var entries = this._entries;
			var keyStamp = this._getValueStamp(key);

			if (entries[keyStamp]) {
				entries[keyStamp].value = value;
			} else {
				var entry = entries[keyStamp] = {
					key: key,
					keyStamp: keyStamp,
					value: value,
					prev: this._last,
					next: null
				};

				if (this.size++) {
					this._last.next = entry;
				} else {
					this._first = entry;
				}

				this._last = entry;
			}

			return this;
		},

		delete: function(key) {
			var keyStamp = this._getValueStamp(key);
			var entry = this._entries[keyStamp];

			if (!entry) {
				return false;
			}

			if (--this.size) {
				var prev = entry.prev;
				var next = entry.next;

				if (prev) {
					prev.next = next;
				} else {
					this._first = next;
				}

				if (next) {
					next.prev = prev;
				} else {
					this._last = prev;
				}
			} else {
				this._first = null;
				this._last = null;
			}

			delete this._entries[keyStamp];
			delete this._objectStamps[keyStamp];

			return true;
		},

		clear: function() {
			var entries = this._entries;

			for (var stamp in entries) {
				delete entries[stamp];
			}

			this._objectStamps = {};

			this._first = null;
			this._last = null;

			this.size = 0;
		},

		forEach: function(callback, context) {
			var entry = this._first;

			while (entry) {
				callback.call(context, entry.value, entry.key, this);

				do {
					entry = entry.next;
				} while (entry && !this._entries[entry.keyStamp]);
			}
		},

		toString: function() {
			return '[object Map]';
		},

		_getValueStamp: function(value) {
			switch (typeof value) {
				case 'undefined': {
					return 'undefined';
				}
				case 'object': {
					if (value === null) {
						return 'null';
					}

					break;
				}
				case 'boolean': {
					return '?' + value;
				}
				case 'number': {
					return '+' + value;
				}
				case 'string': {
					return ',' + value;
				}
			}

			return this._getObjectStamp(value);
		},

		_getObjectStamp: function(obj) {
			if (!hasOwn.call(obj, KEY_MAP_ID)) {
				if (!Object.isExtensible(obj)) {
					var stamps = this._objectStamps;
					var stamp;

					for (stamp in stamps) {
						if (hasOwn.call(stamps, stamp) && stamps[stamp] == obj) {
							return stamp;
						}
					}

					stamp = String(++mapIdCounter);
					stamps[stamp] = obj;

					return stamp;
				}

				Object.defineProperty(obj, KEY_MAP_ID, {
					value: String(++mapIdCounter)
				});
			}

			return obj[KEY_MAP_ID];
		}
	};

	[
		['keys', function(entry) {
			return entry.key;
		}],
		['values', function(entry) {
			return entry.value;
		}],
		['entries', function(entry) {
			return [entry.key, entry.value];
		}]
	].forEach(function(settings) {
		var getStepValue = settings[1];

		Map.prototype[settings[0]] = function() {
			var entries = this._entries;
			var entry;
			var done = false;
			var map = this;

			return {
				next: function() {
					if (!done) {
						if (entry) {
							do {
								entry = entry.next;
							} while (entry && !entries[entry.keyStamp]);
						} else {
							entry = map._first;
						}

						if (entry) {
							return {
								value: getStepValue(entry),
								done: false
							};
						}

						done = true;
					}

					return {
						value: undefined,
						done: true
					};
				}
			};
		};
	});
}

if (!Map.prototype[Symbol.iterator]) {
	Map.prototype[Symbol.iterator] = Map.prototype.entries;
}

var Set = global.Set;

if (!Set || Set.toString().indexOf('[native code]') == -1 || !new Set([1]).size) {
	Set = function Set(values) {
		this._values = new Map(values ? values.map(function(value) {
			return [value, value];
		}) : []);

		this.size = 0;
	};

	Set.prototype = {
		constructor: Set,

		has: function(value) {
			return this._values.has(value);
		},

		add: function(value) {
			this._values.set(value, value);
			this.size = this._values.size;
			return this;
		},

		delete: function(value) {
			if (this._values.delete(value)) {
				this.size--;
				return true;
			}

			return false;
		},

		clear: function() {
			this._values.clear();
			this.size = 0;
		},

		forEach: function(callback, context) {
			this._values.forEach(function(value) {
				callback.call(context, value, value, this);
			}, this);
		},

		keys: Map.prototype.keys,
		values: Map.prototype.values,
		entries: Map.prototype.entries
	};
}

if (!Set.prototype[Symbol.iterator]) {
	Set.prototype[Symbol.iterator] = Set.prototype.values;
}

if (typeof module != 'undefined') {
	exports.Map = Map;
	exports.Set = Set;
} else {
	global.Map = Map;
	global.Set = Set;
}
