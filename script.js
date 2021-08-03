---
---

$(document).ready(initialize);

const user = 'steve';

const api_url = "{{ site.api_url }}";

var scroll_lock = false;
var scroll_wait = 1000;

function initialize(){
  marked.setOptions({'smartypants':true});
  $('#prev').click(go_prev);
  $('#next').click(go_next);
  $('.page_text').scroll(on_text_scroll);
  $('.dpad').click(on_click_dpad);
  update_page();
}

function go_next(evt){
  $.get(`${api_url}/api/next/${user}`).then(update_page);
}

function go_prev(evt){
  $.get(`${api_url}/api/prev/${user}`).then(update_page);
}

function update_crank(percent){
  let angle = percent * 360 / 100;
  $('.crank').css('transform', 'rotate(' + angle + 'deg)');
}

function on_click_dpad(evt){
  let target = $(evt.target);
  if (target.hasClass('east')){
    show_choices();
  } else if (target.hasClass('west')){
    hide_choices();
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
  update_crank(percent);
  $('.progress-bar').css('width', percent+'%');
  $('#page_count').html(count);
  $('#page_index').html(index+1);
}

function render_choices(data){
  console.log('rendering', data);
  if ($.isEmptyObject(data)){
    return;
  }
  let title = $("<h2/>").addClass('prompt').text('Will you change the timeline?')
  console.log(data);
  let choiceA = $('<div/>').addClass('col choice a')
      .append($('<div/>').addClass('init').text('A'), $('<div/>').addClass('text').text(data.A));
  let choiceB = $('<div/>').addClass('col choice b')
      .append($('<div/>').addClass('init').text('B'), $('<div/>').addClass('text').text(data.B));
  let crow = $('<div/>').addClass('row').append(choiceB, choiceA);
  $('.choices').empty().append(title, crow);
}

function onClickChoice(evt){
  console.log(evt.currentTarget);
  $('.choice.active').removeClass('active');
  $(evt.currentTarget).addClass('active');
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
  $('.choices').show();
}
function hide_choices(){
  $('.page_text').show();
  $('.choices').hide();
}
