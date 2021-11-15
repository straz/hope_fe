class Config {
  constructor() {
    this.key = 'config';
    this.values = {};
    this.load();
  }

  get(key){
    return this.values[key];
  }

  set(key, value){
    this.values[key] = value;
    this.save()
  }
  
  load(){
    let config_str = window.localStorage.getItem(this.key);
    if (config_str == null) {
      this.values = {};
    } else {
      this.values = JSON.parse(config_str);
    }
  }

  save(){
    let persist = JSON.stringify(this.values);
    window.localStorage.setItem(this.key, persist);
  }

  static reset_all(){
    window.localStorage.clear();
    console.log('reset all');
    window.location.reload(true);
  }

}


class World {
  static key = 'world';
  static default_name = 'simple';
  
  constructor(body) {
    this.fresh_start = true;
    this.name = body.name;
    this.id = body.id;
    this.hopes = body.hopes;
    this.regrets = body.regrets;
    this.pages = {};
    // Construct Page instances
    for (var page_name in body.pages){
      let page = new Page(this, body.pages[page_name]);
      this.pages[page_name] = page;
      page.page_name = page_name;
    }
    for (var page_name in body.pages){
      let page = this.pages[page_name];
      let src_page = body.pages[page_name];
      if ('next_id' in src_page){
	let next_page = this.pages[src_page.next_id];
	page['next_page'] = next_page;
      }
    }
    this.first_page = this.pages[body.first_page];
    this.timeline = new Timeline(this);
    TIMELINE = this.timeline;
  }

  // Looks in local storage for world. If not found, loads from API.
  // World.setup() returns a $.Deferred, which resolves with the loaded World.
  static setup(){
    let deferred = $.Deferred();
    function load(data){
      window.localStorage.setItem(World.key, JSON.stringify(data));
      deferred.resolve(new World(data));
    }
    let persist = window.localStorage.getItem(World.key);
    if (persist == null) {
      $.getJSON('worlds/' + World.default_name + '/build.json', load);
      return deferred;
    }
    deferred.resolve(new World(JSON.parse(persist)))
    return deferred;
  }
}

class Page {
  constructor(world, body){
    this.world = world;
    this.context = {};
    if ('meta' in body){
      this.context = body.meta;
    }
    this.template = body.text;
    if ('next_id' in body){
      this.next_id = body.next_id;
    }
    if ('choices' in body){
      this.choices = body.choices;
    }
    this.recalc_context('start');
  }

  // scope is 'start' or 'chosen'
  // find all the keys for this scope
  // can be '.js', or '.md'
  // update context: reset values for keys
  recalc_context(scope) {
    for (var key in this.context){
      if (key.substr(0,scope.length+1)==scope+'.'){
	let parts = key.split('.');
	let value = this.context[key];
	if (parts[2] == 'js'){
	  let fcn = '()=>'+value;
	  let result = eval(fcn).apply(this);
	  this.context[parts[1]] = result
	} else if (parts[2] == 'md'){
	  this.context[parts[1]] = marked(value);
	} else {
	  console.error('weird key: ' + key)
	}}}
  }

  recalc() {
    this.recalc_context('chosen');
    this.render_text();
    if ('next_id' in this) {
      return {'next_id' : this.next_id}
    }
  }


  render_text() {
    // look for occurrences of "{{ key }}" in template
    this.text = this.world.pages[this.page_name].template;
    let regexp = /{{\s*(\w*)\s*}}/g;
    let matches = [...this.text.matchAll(regexp)]
    for (var i in matches){
      let match = matches[i][0]; // "{{ phone }}"
      let key = matches[i][1];   // "phone"
      if (key in this.context){
	let result = this.context[key];
	this.text = this.text.replaceAll(match, result);
      }
    }
  }

  context_lookup(name){
    if (name in this.context){
      return this.context.name;
    }
    if ('prev_page' in this){
      return this.prev_page.context_lookup(name);
    }
    return null;
  }
}

class Timeline {
  static key = 'timeline';
  
  constructor(world){
    this.page_index = 0;
    this.world = world;
    this.pages = [];
    this.load(world);
  }

  // load timeline from local storage
  load(world) {
    let persisted = JSON.parse(window.localStorage.getItem(Timeline.key));
    if (persisted == null){
      console.log('new blank timeline');
    } else if (persisted.world_id != world.id){
      console.error(`saved timeline ${persisted.world_id} doesn't match` +
		    `current world ${world.id}`);
    } else {
      world.fresh_start = false;
      this.page_index = persisted.page_index;
      for (var i in persisted.pages){
	let page_ref = persisted.pages[i];
	let name = page_ref.page_name;
	let page = world.pages[name];
	page.context = page_ref.context;
      }
    }
    this.recalc_pages(world.first_page);
  }

  current_page(){
    return this.pages[this.page_index];
  }

  // Advance timeline.current to the next page
  go_next() {
    let current = this.page_index;
    if (this.pages.length == current + 1){
      return current;
    }
    this.page_index += 1;
    this.save();
    return this.page_index;
  }

  // Step timeline.current back to the previous page
  go_prev() {
    if (this.page_index == 0) {
      return current;
    }
    this.page_index -= 1;
    this.save();
    return this.page_index;
  }

  // returns {'page_index': N, "page_count": N}
  page_loc(){
    return {"page_index": this.page_index,
	    "page_count": this.pages.length}
  }

  // returns {"score": N, "out_of": N}
  score_all(){
    return {"score": 0, "out_of": 6};
  }

  // creates the list of timeline pages
  // sets doubly-linked prev/next pointers
  recalc_pages(page){
    this.pages.push(page);
    let calc = page.recalc();
    if (calc != null && "next_id" in calc){
      let next_page_id = calc["next_id"];
      let next_page = this.world.pages[next_page_id];
      next_page.prev_page = page;
      this.recalc_pages(next_page);
    }
  }

  // save to local storage
  save() {
    let persist = {
      'page_index': this.page_index,
      'world_id': this.world.id
    };
    let pages = [];
    persist.pages = pages;
    for (var i in this.pages){
      let page = this.pages[i];
      let saved = {
	'page_name': page.page_name,
	'context': page.context,
      }
      pages.push(saved);
    }
    window.localStorage.setItem(Timeline.key, JSON.stringify(persist));
  }
}

// make a copy of this page's text
function str_copy(string) {
  return (' ' + string).slice(1);
}
