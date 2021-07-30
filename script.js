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
  update_page();
}

function go_next(evt){
  $.get(`${api_url}/api/${user}/next`).then(update_page);
}

function go_prev(evt){
  $.get(`${api_url}/api/${user}/prev`).then(update_page);
}

function update_crank(percent){
  let angle = percent * 360 / 100;
  $('.crank').css('transform', 'rotate(' + angle + 'deg)');
}


function update_page(){
  $.getJSON(`${api_url}/api/${user}/current`).then(
    (data)=> {
      $('.page_text').scrollTop(0).html(marked(data.page_text));
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
    console.log('top!');
    if (!scroll_lock){
      lock_scroll('top');
      //go_prev();
    }
  }
  if ( pos == $(div)[0].scrollHeight - $(div).height()) {
    console.log('bottom!');
    if (!scroll_lock){
      lock_scroll('bottom');
      //$(div).scrollTop(0);
      //go_next();
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
  if ($.isEmptyObject(data)){
    $('.choices').addClass('d-none');
    return;
  }
  let btnA = $('<input/>').attr({type:'radio', class:"btn-check",
				 name:"options", id:"optionA"})
  let lblA = $('<label/>').addClass('btn btn-warning btn-sm m-1')
      .attr({for: 'optionA'}).text('A')

  let btnB = $('<input/>').attr({type:'radio', class:"btn-check",
				 name:"options", id:"optionB"})
  let lblB = $('<label/>').addClass('btn btn-warning btn-sm m-1')
      .attr({for: 'optionB'}).text('B')

  let gA = $('<div/>').addClass('choice').append(btnA, lblA, data.A);
  let gB = $('<div/>').addClass('choice').append(btnB, lblB, data.B);

  $('.choices').removeClass('d-none').empty()
    .append("Meddle: ", gA, gB)
  $('.choice').click(onClickChoice);
}

function onClickChoice(evt){
  console.log(evt.currentTarget);
  $('.choice.active').removeClass('active');
  $(evt.currentTarget).addClass('active');
}

function unlock_scroll(){
  scroll_lock = false;
  console.log('unlocked');
}

function lock_scroll(pos){
  if (scroll_lock){
    return;
  }
  $( ".bumper."+pos ).css( "display", "block" ).fadeOut("slow", unlock_scroll);
  scroll_lock = true;
  console.log('locked');
}
