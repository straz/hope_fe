var READY = null;    // deferred until game state is loaded
var CONFIG = null;   // user preferences
var WORLD = null;    // overall game definition
var TIMELINE = null; // persisted game state

const VIEW = {
  scroll_amount: '200px',
  scroll_lock: false,
  has_choices: false
}

$(document).ready(initialize);

function initialize(){
  // restore any saved preferences configuration
  CONFIG = new Config();
  restore_saved_color();

  // restore game state
  // wait for marked.js to load
  //var markedjs = document.querySelector('#markedjs');
  //script.addEventListener('load',
  console.log('marked:', typeof marked)
  READY = World.setup();
  READY.then((world)=> {
    WORLD=world;
    update_page(world.timeline);
  });
  // setup GUI
  $('.case').css('display', 'block');
  marked.setOptions({'smartypants':true});
  $('.crank .up').click(go_prev);
  $('.crank .down').click(go_next);
  $('.page_text').scroll(on_text_scroll);
  $('.dpad').click(on_click_dpad);
  $('.abgroup .outer.ab').click(on_click_ab);
  $('.gear_panel .gear_toggle').click(on_click_gear);
  $('.gear_panel .set_color').click(on_click_setcolor);
  $('.gear_panel button.reset').click(Config.reset_all);
  $(document).keypress(on_keypress);
}


// screen mode: returns oneof 'intro', 'choices', 'timeline'
function now_showing(){
  if ($('.intro').css('display') != 'none') {
    return 'intro';
  } else if ($('.choices').css('display') != 'none') {
    return 'choices';
  }
  return 'timeline';
}

function show_intro(){
  $('.page_text, .statusbar').hide();
  $('.intro').show();
}
  
function hide_intro(){
  $('.page_text, .statusbar').show();
  $('.intro').hide();
}
  

// handle 'A' or 'B' key/click event
function on_click_ab(evt){
  if ($(evt).hasClass('ab')){
    target = $(evt);
  } else {
    target = $(evt.target).closest('.outer');
  }
  if (now_showing() == 'intro') {
    return;
  }
  if (now_showing() != 'choices') {
    // only change checkmark if .choices are visible
    return;
  }
  // Change checkmark

  if (target.hasClass('a')){
    active_choice = 'A'
  } else if (target.hasClass('b')) {
    active_choice = 'B'
  }
  let page = TIMELINE.current_page();
  page.context.choice = active_choice;
  page.recalc();
  TIMELINE.save();
  update_checks(true);
}

// keyboard typed 'A' or 'B', forward to on_click_ab()
function on_keypress(evt){
  let chr = String.fromCharCode(evt.charCode).toUpperCase();
  if (chr == 'A'){
    on_click_ab($('.abgroup .a'));
  } else if (chr == 'B'){
    on_click_ab($('.abgroup .b'));
  }
}

function go_next(evt){
  if (READY.state() != 'resolved'){
    return;
  }
  if (is_page_bottom()){
    TIMELINE.go_next();
    update_page(TIMELINE);
  } else {
    $('.page_text').animate({scrollTop: '+=' + VIEW.scroll_amount}, 800);
  }
}

function go_prev(){
  if (READY.state() != 'resolved'){
    return;
  }
  if (is_page_top()){
    TIMELINE.go_prev();
    update_page(TIMELINE);
  } else {
    $('.page_text').animate({scrollTop: '-=' + VIEW.scroll_amount}, 800);
  }
}

function on_click_dpad(evt){
  if (now_showing() == 'intro'){
    hide_intro();
    if (WORLD.fresh_start){
      // User has started the game, remove 'fresh_start' flag.
      WORLD.fresh_start = false;
      TIMELINE.save();
    }
    update_page(TIMELINE);
    return;
  }
  let target = $(evt.target);
  if (target.hasClass('east')){
    if (now_showing() == 'timeline' && VIEW.has_choices) {
      show_choices();
      return;
    }
  } else if (target.hasClass('west')){
    if (now_showing() == 'choices'){
      hide_intro();
      hide_choices();
      update_page(TIMELINE);
      return;
    }
    if (now_showing() == 'timeline'){
      show_intro();
    }
  } else if (target.hasClass('north') && now_showing() == 'timeline'){
    go_prev();
  } else if (target.hasClass('south') && now_showing() == 'timeline'){
    go_next();
  }
}

function update_page(timeline){
  if (READY.state() != 'resolved'){
    return;
  }
  // if first time, show intro instead
  if (timeline.world.fresh_start){
    show_intro();
    return;
  }
  let page = timeline.current_page();
  $('.page_text').scrollTop(0).html(marked.parse(page.text));
  hide_choices();
  render_score(timeline.score_all());
  render_pagebar(timeline.page_loc());
  render_choices(page.choices);
}


function is_page_top(){
  let div = $('.page_text');
  let pos = $(div).scrollTop();
  return pos == 0;
}

function is_page_bottom(){
  let div = $('.page_text');
  let pos = $(div).scrollTop();
  return pos == ($(div)[0].scrollHeight - $(div).height());
}


function on_text_scroll(evt){
  let div = evt.target;
  let pos = $(div).scrollTop();
  if ( pos == 0){
    if (!VIEW.scroll_lock){
      lock_scroll('top');
    }
  }
  if ( pos == $(div)[0].scrollHeight - $(div).height()) {
    if (!VIEW.scroll_lock){
      lock_scroll('bottom');
    }
  }
}

function render_score(data){
  $('#score').html(data.score);
  $('#out_of').html(data.out_of);
}

function render_pagebar(data){
  let count = data.page_count; // N pages
  let index = data.page_index; // start=0
  let percent = 100.0*(index)/(count-1)
  $('.progress-bar').css('width', percent+'%');
  $('#page_count').html(count);
  $('#page_index').html(index+1);
}

function render_choices(data){
  if ($.isEmptyObject(data)){
    VIEW.has_choices = false;
    $('.go_ab').hide();
    return;
  }
  VIEW.has_choices = true;
  $('.go_ab').show();
  let goback = $('.goback');
  let prompt = data.prompt;
  let title = $("<div/>").addClass('prompt').text(prompt);

  let initA = $('<div/>').addClass('init').text('A');
  let checkA = $('<div/>').addClass('check ms-3').html($('<i/>').addClass(['far', 'fa-check']));
  let textA = $('<div/>').addClass('text').text(data.A);
  let titleA = $('<div/>').addClass('d-flex flex-row').append(initA, checkA);
  let choiceA = $('<div/>').addClass('col choice a').append(titleA, textA);

  let initB = $('<div/>').addClass('init').text('B');
  let checkB = $('<div/>').addClass('check ms-3').html($('<i/>').addClass(['far', 'fa-check']));
  let textB = $('<div/>').addClass('text').text(data.B);
  let titleB = $('<div/>').addClass('d-flex flex-row').append(initB, checkB);
  let choiceB = $('<div/>').addClass('col choice b').append(titleB, textB);

  let crow = $('<div/>').addClass('row').append(choiceB, choiceA);
  $('.choices').empty().append(title, crow, goback);
  update_checks()
}

// if animate=true, fade in/out the choices
function update_checks(animate){
  if (animate == true && $('.choices').css('display') != 'none'){
    $('.choices').fadeOut(()=>{
      redraw_checks()
      $('.choices').fadeIn();
    })
  } else {
    redraw_checks()
  }
}

function redraw_checks(){
  let context = TIMELINE.current_page().context;
  if (!('choice' in context)) {
    context.choice = 'A'
  }
  if (context.choice == 'A') {
    $('.choice.a .check').show();
    $('.choice.b .check').hide();
  } else if (context.choice == 'B') {
    $('.choice.b .check').show();
    $('.choice.a .check').hide();
  }
}

// pos is 'top' or 'bottom'
function lock_scroll(pos){
  if (VIEW.scroll_lock){ return; }
  $( ".bumper."+pos ).css( "display", "block" ).fadeOut("slow", unlock_scroll);
  VIEW.scroll_lock = true;
}

function unlock_scroll(){
  VIEW.scroll_lock = false;
}

function show_choices(){
  $('.page_text').hide();
  $('.go_ab').hide();
  $('.choices').show();
}
function hide_choices(){
  $('.page_text').show();
  if (VIEW.has_choices){
    $('.go_ab').show();
  }
  $('.choices').hide();
}

function locator(node){
  var rect = node.getBoundingClientRect();
  let loc = $('<div/>').addClass('loc').css({ position: 'absolute',
					      left: rect.x + window.scrollX,
					      top: rect.y + window.scrollY,
					      width: rect.width,
					      height: rect.height,
					      'background-color': '#f805',
					    });
  $('body').append(loc);
  return loc;
}

function on_click_gear(){
  $('.gear_panel').toggleClass('closed');
}

function on_click_setcolor(evt){
  let target = $(evt.target);
  let color = target.css('background-color');
  $('.case').css('background-color', color);
  CONFIG.set('setColor', color);
}

function restore_saved_color(){
  if (CONFIG != null){
    let color = CONFIG.get('setColor');
    if (color != null && typeof(color) != 'undefined') {
      $('.case').css('background-color', CONFIG.get('setColor'));
    }
  }
}
