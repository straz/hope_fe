---
---

$(document).ready(initialize);

const user = 'steve';

const api_url = "{{ site.api_url }}";

const scroll_amount = '200px';
var scroll_lock = false;
var scroll_wait = 1000;
var has_choices = false;
var active_choice = null;

function initialize(){
  marked.setOptions({'smartypants':true});
  $('.crank .up').click(go_prev);
  $('.crank .down').click(go_next);
  $('.page_text').scroll(on_text_scroll);
  $('.dpad').click(on_click_dpad);
  $('.abgroup .outer.ab').click(on_click_ab);
  $(document).keypress(on_keypress);
  update_page();

}

// handle 'A' or 'B' key/click event
function on_click_ab(evt){
  if ($(evt).hasClass('ab')){
    target = $(evt);
  } else {
    target = $(evt.target).closest('.outer');
  }
  if (target.hasClass('a')){
    active_choice = 'A'
    console.log('a');
  } else if (target.hasClass('b')) {
    active_choice = 'B'
    console.log('b');
  }
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
  if (is_page_bottom()){
    $.get(`${api_url}/api/next/${user}`).then(update_page);
  } else {
    $('.page_text').animate({scrollTop: '+=' + scroll_amount}, 800);
  }
}

function go_prev(evt){
  if (is_page_top()){
    $.get(`${api_url}/api/prev/${user}`).then(update_page);
  } else {
    $('.page_text').animate({scrollTop: '-=' + scroll_amount}, 800);
  }
}


function on_click_dpad(evt){
  let target = $(evt.target);
  if (has_choices && target.hasClass('east')){
    show_choices();
  } else if (target.hasClass('west')){
    hide_choices();
  } else if (target.hasClass('north')){
    go_prev();
  } else if (target.hasClass('south')){
    go_next();
  }
}

function update_page(){
  $.getJSON(`${api_url}/api/current/${user}`).then(
    (data)=> {
      $('.page_text').scrollTop(0).html(marked(data.page_text));
      hide_choices();
      render_score(data);
      render_pagebar(data);
      render_choices(data.choices);
    }
  );
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
    // console.log('top!');
    if (!scroll_lock){
      lock_scroll('top');
      // go_prev();
    }
  }
  if ( pos == $(div)[0].scrollHeight - $(div).height()) {
    // console.log('bottom!');
    if (!scroll_lock){
      lock_scroll('bottom');
      // go_next();
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
    has_choices = false;
    $('.go_ab').hide();
    return;
  }
  has_choices = true;
  $('.go_ab').show();
  let goback = $('.goback');
  let title = $("<h2/>").addClass('prompt').text('Will you change the timeline?');

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
  active_choice = 'A';
  update_checks()
}

// if animate=true, fade in/out the choices
function update_checks(animate){
  if (animate == true){
    $('.choices').fadeOut(()=>{
      redraw_checks()
      $('.choices').fadeIn();
    })
  } else {
    redraw_checks()
  }
}

function redraw_checks(){
  if (active_choice == 'A') {
    $('.choice.a .check').show();
    $('.choice.b .check').hide();
  } else if (active_choice == 'B') {
    $('.choice.b .check').show();
    $('.choice.a .check').hide();
  }
}

// pos is 'top' or 'bottom'
function lock_scroll(pos){
  if (scroll_lock){ return; }
  $( ".bumper."+pos ).css( "display", "block" ).fadeOut("slow", unlock_scroll);
  scroll_lock = true;
  console.log('locked');
}

function unlock_scroll(){
  scroll_lock = false;
  console.log('unlocked');
}

function show_choices(){
  $('.page_text').hide();
  $('.go_ab').hide();
  $('.choices').show();
}
function hide_choices(){
  $('.page_text').show();
  if (has_choices){
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
