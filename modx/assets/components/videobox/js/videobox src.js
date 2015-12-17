/**	
 *	@author		HitkoDev http://hitko.eu/videobox
 *	@copyright	Copyright (C) 2015 HitkoDev All Rights Reserved.
 *	@license	http://www.gnu.org/licenses/gpl-3.0.html GNU/GPL
 *
 *	This program is free software: you can redistribute it and/or modify
 *	it under the terms of the GNU General Public License as published by
 *	the Free Software Foundation, either version 3 of the License, or
 *	any later version.
 *
 *	This program is distributed in the hope that it will be useful,
 *	but WITHOUT ANY WARRANTY; without even the implied warranty of
 *	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *	GNU General Public License for more details.
 *
 *	You should have received a copy of the GNU General Public License
 *	along with this program. If not, see <http://www.gnu.org/licenses/>
 */

(function($) {
	
	var videos, activeURL, activeVideo, win = $(window), open = false, 
	wrap, center, content, responsive, video, bottomContainer, bottom, caption, button, closeText,
	animations = [],

	options = defaults = {
		videoWidth: 720,		//	default player width
		videoHeight: 405,		//	default player height
		closeText: 'Close',		//	text for the close button
		padding: 30,			//	player padding
		animation: {			//	animation properties (see web animations)
			duration: 500,
			iterations: 1,
			delay: 0,
			easing: 'ease-in-out'
		},
	};
	
	/**
	 *	Opens Videobox
	 *
	 *	@param _videos - array of videos as [player_url, title, player_width, player_height]
	 *	@param startVideo - index of the curent video
	 *	@param _options - Videobox options, see defaults for details
	 *	@param origin - {x, y, w} window coordinates where the pop-up should appear from (default is window center) and width (default 15%)
	 */
	$.videobox = function(_videos, startVideo, _options, origin) {
		$.extend(options, defaults, _options);
		$.vbiClose();
		$.vbClose();
		setup(); 
		videos = _videos;
		changeVideo(startVideo, origin);
		return false;
	}; 
	
	/**
	 *	Closes the Videobox
	 */
	$.vbClose = function() {
		stop();
		$([wrap, bottomContainer, overlay]).toggleClass('visible', false);
		$(wrap).toggleClass('animating', false);
		$(wrap).css({
			top: 0,
			left: 0
		});
		if(activeVideo >= 0) activeVideo = -1;
		return false;
	};

	/**
	 *	Maps Videobox to elements
	 *
	 *	@param this - list of elements, for example $(selector)
	 *	@param _options - Videobox options, see defaults for details
	 *	@callback linkMapper - receives an element, returns array of video attributes [player_url, title, player_width, player_height]
	 */
	$.fn.videobox = function(_options, linkMapper) {
		linkMapper = linkMapper || function(el) {
			return [el.getAttribute("href"), el.getAttribute("title"), el.getAttribute("data-videowidth"), el.getAttribute("data-videoheight")];
		};
		
		var links = this;
		
		return links.unbind("click").click(function(evt) {
			
			var link = this, startIndex = 0, mappedLinks = links.slice(), target = $($(this).find($(this).attr("data-target"))[0] || this);
			
			for(var i = 0; i < mappedLinks.length; i++){
				if(mappedLinks[i] == link) startIndex = i;
				mappedLinks[i] = linkMapper(mappedLinks[i], i);
			}
			
			target.toggleClass('vb_line_fix', true);		//	fix multi-line targets
			var origin = {
				x: target.offset().left - win.scrollLeft() + $(target).innerWidth()/2,
				y: target.offset().top - win.scrollTop() + $(target).innerHeight()/2,
				w: target.innerWidth(),
			};
			target.toggleClass('vb_line_fix', false);
			
			return $.videobox(mappedLinks, startIndex, _options, origin);
		});
		return false;
	};
	
	// append Videobox elements
	$(function() {
		$("body").append(
			$([
				overlay = $('<div id="vbOverlay" />').click($.vbClose)[0],
				wrap = $('<div id="vbWrap" />')[0]
			])
		); 
		center = $('<div id="vbCenter" />').appendTo(wrap)[0];
		content = $('<div id="vbContent" />').appendTo(center).append([
			responsive = $('<div id="vbResponsive" />')[0],
			bottomContainer = $('<div id="vbBottomContainer" />')[0],
		])[0];
		video = $('<iframe id="vbVideo" frameborder="0" allowfullscreen="true" oallowfullscreen msallowfullscreen webkitallowfullscreen mozallowfullscreen />').css('display', 'none').appendTo(responsive)[0];
		bottom = $('<div id="vbBottom" />').appendTo(bottomContainer).append([
			button = $('<a id="vbCloseLink" href="#" ><span id="vbCloseText">' + defaults.closeText + '</span><i class="vb-icon-close"></i></a>').click($.vbClose)[0], 
			caption = $('<span id="vbCaption" />')[0]
		])[0];
		closeText = $(bottom).find('#vbCloseText')[0];
	});
	
	// set initial pop-up parameters
	function setup() {
		$(closeText).html(options.closeText);
		$(center).css('padding', options.padding);
	}

	function changeVideo(i, origin) {
		if(i >= 0 && i < videos.length){
			activeVideo = i;
			activeURL = videos[i][0];
			stop();
			$(caption).html(videos[activeVideo][1] || "");
			
			setPlayer();
			
			// animate player
			open = true;
			$([wrap, overlay]).toggleClass('visible', true);
			$(wrap).toggleClass('animating', true);
			
			var org = {
				top: (origin ? -($(wrap).innerHeight()/2-origin.y) : 0) + 'px', 
				left: (origin ? -($(wrap).innerWidth()/2-origin.x) : 0) + 'px', 
				'max-width': (origin ? (origin.w+2*options.padding) + 'px' : '15%')
			};
			var dest = {
				top: '0px',
				left: '0px',
				'max-width': (parseInt(videos[activeVideo][2] || options.videoWidth) + 2*options.padding) + 'px'
			};
			$(center).css(org);
			var anim = center.animate([
				org, dest
			], options.animation);
			anim.addEventListener('finish', function(){
				$(center).css(dest);
				var v1 = bottomContainer.animate([
					{'max-height': '0px'},
					{'max-height': '200px'}
				], options.animation);
				v1.addEventListener('finish', function(){
					$(bottomContainer).toggleClass('visible', true);
					showVideo();
				});
				animations.push(v1);
			});
			animations.push(anim);
			
		}
		return false;
	}
	
	// set player
	function setPlayer(){
		var width = parseInt(videos[activeVideo][2] || options.videoWidth);
		var height = parseInt(videos[activeVideo][3] || options.videoHeight);
		
		$(wrap).css({
			top: win.scrollTop(),
			left: win.scrollLeft()
		});
		
		// downsize player if needed
		if(width + 2*options.padding > $(wrap).innerWidth()) width = $(wrap).innerWidth() - 2*options.padding;
		height = (height * width)/(videos[activeVideo][2] || options.videoWidth);
		if(height + 2*options.padding > $(wrap).innerHeight()) height = $(wrap).innerHeight() - 2*options.padding;
		
		// set ratio
		var ratio = (height*100)/width;
		$(responsive).css('padding-bottom', ratio + '%');
	}

	function showVideo(){
		if(!open || $(video).attr('src') != '') return;
		$(video).show();
		video.src = activeURL;
		$(wrap).toggleClass('animating', false);
	}

	function stop() {
		for(var i = 0; i < animations.length; i++) animations[i].cancel();
		animations = [];
		open = false;
		video.src = "";
		$(video).hide();
	}

	win.on("resize", function() {
		if(activeVideo >= 0) setPlayer();
	});

	// AUTOLOAD CODE BLOCK (MAY BE CHANGED OR REMOVED)
	$("a[rel^='videobox']").videobox({ /* Put custom options here */ });
	
})(jQuery);

(function($) {
	
	var videos = [], activeURL, activeVideo, win = $(window), open = false, hidden = [], hvt = true, svt = false,
	wrap, responsive, video, caption, button, initialised = false, animations = [],

	options = defaults = {
		videoWidth: 720,		//	default player width
		videoHeight: 405,		//	default player height
		closeText: 'Close',		//	text for the close button
		padding: 30,			//	player padding
		baseWidth: 200,			//	initial player width
		baseHeight: 150,		//	initial player height
		target: '',				//	empty target
		animation: {			//	animation properties (see web animations)
			duration: 500,
			iterations: 1,
			delay: 0,
			easing: 'ease-in-out'
		},
	};
	
	/**
	 *	Opens Videobox
	 *
	 *	@param _videos - array of videos as [player_url, title, player_width, player_height]
	 *	@param startVideo - index of the curent video
	 *	@param _options - Videobox options, see defaults for details
	 *	@param origin - {x, y, w} window coordinates where the pop-up should appear from (default is window center) and width (default 15%)
	 */
	$.vbinline = function(_videos, startVideo, _options, target) {
		$.extend(options, defaults, _options);
		$.vbClose();
		videos = _videos;
		activeVideo = startVideo;
		svt = true;
		stop();
		return false;
	}; 
	
	/**
	 *	Closes the Videobox
	 */
	$.vbiClose = function(){
		stop();
		if(activeVideo >= 0) activeVideo = -1;
		return false;
	};

	/**
	 *	Maps Videobox to elements
	 *
	 *	@param this - list of elements, for example $(selector)
	 *	@param _options - Videobox options, see defaults for details
	 *	@callback linkMapper - receives an element, returns array of video attributes [player_url, title, player_width, player_height]
	 */
	$.fn.vbinline = function(_options, linkMapper) {
		linkMapper = linkMapper || function(el) {
			return [el.getAttribute("href"), el.getAttribute("title"), el.getAttribute("data-videowidth"), el.getAttribute("data-videoheight"), el.getAttribute("data-style"), el.getAttribute("data-class")];
		};
		
		var links = this;
		
		return links.unbind("click").click(function(evt) {
			
			var link = this, startIndex = 0, mappedLinks = links.slice(), target = $($(link).find($(link).attr("data-target"))[0] || link);
			
			for(var i = 0; i < mappedLinks.length; i++){
				if(mappedLinks[i] == link) startIndex = i;
				mappedLinks[i] = linkMapper(mappedLinks[i], i);
			}
			
			$.extend(_options, {
				target: link,
				baseWidth: target.width(),
				baseHeight: target.height(),
			});
			
			return $.vbinline(mappedLinks, startIndex, _options);
		});
		return false;
	};
	
	// create vbInline elements
	$(function() {
		wrap = $('<div id="vbiWrap" />').append([
			responsive = $('<div id="vbiResponsive" />')[0],
			caption = $('<span class="vb_video_title"></span>')[0],
			button = $('<div id="vbiClose"><i class="vb-icon-circle-close-invert"></i></div>').click($.vbiClose)[0],
		])[0];
		video = $('<iframe id="vbiVideo" frameborder="0" allowfullscreen="true" oallowfullscreen msallowfullscreen webkitallowfullscreen mozallowfullscreen />').css('display', 'none').appendTo(responsive)[0];
	});
	
	// set player parameters
	function setup() {
		$(options.target).after(wrap);
		$(options.target).hide();
		hidden = [options.target];
	}

	function changeVideo() {
		if(activeVideo >= 0 && activeVideo < videos.length){
			activeURL = videos[activeVideo][0];
			$(wrap).attr('style', videos[activeVideo][4]);
			$(wrap).attr('class', videos[activeVideo][5]);
			
			setup();
			
			$(caption).html(videos[activeVideo][1] || "");
			$(wrap).toggleClass('visible', true);
			open = true;
			
			var org = {
				'max-width': options.baseWidth + 'px'
			};
			var dest = {
				'max-width': (parseInt(videos[activeVideo][2] || options.videoWidth) + 2*options.padding) + 'px'
			};
			var v1 = wrap.animate([org, dest], options.animation);
			v1.addEventListener('finish', function(){
				$(wrap).css(dest);
			});
			animations.push(v1);
			
			var org2 = {
				'padding-bottom': (options.baseHeight*100)/options.baseWidth + '%'
			};
			var width = parseInt(videos[activeVideo][2] || options.videoWidth);
			var height = parseInt(videos[activeVideo][3] || options.videoHeight);
			var dest2 = {
				'padding-bottom': (height*100)/width + '%'
			};
			var v2 = responsive.animate([org2, dest2], options.animation);
			v2.addEventListener('finish', function(){
				$(responsive).css(dest2);
				showVideo();
			});
			animations.push(v2);
		}
	}

	function showVideo(){
		if(!open || $(video).attr('src') != '') return;
		$(video).show();
		video.src = activeURL;
	}

	function stop() {
		for(var i = 0; i < animations.length; i++) animations[i].cancel();
		animations = [];
		open = false;
		video.src = "";
		$(video).hide();
		
		if($(wrap).parent().length > 0){
			var org = {
				'max-width': (parseInt(videos[activeVideo][2] || options.videoWidth) + 2*options.padding) + 'px'
			};
			var dest = {
				'max-width': options.baseWidth + 'px'
			};
			var v1 = wrap.animate([org, dest], options.animation);
			animations.push(v1);
			
			var width = parseInt(videos[activeVideo][2] || options.videoWidth);
			var height = parseInt(videos[activeVideo][3] || options.videoHeight);
			var org2 = {
				'padding-bottom': (height*100)/width + '%'
			};
			var dest2 = {
				'padding-bottom': (options.baseHeight*100)/options.baseWidth + '%'
			};
			var v2 = responsive.animate([org2, dest2], options.animation);
			v2.addEventListener('finish', function(){
				$(wrap).detach();
				$(wrap).toggleClass('visible', false);
				for(a in hidden) $(hidden[a]).show();
				if(svt){
					svt = false;
					changeVideo();
				}
			});
			animations.push(v2);
		} else if(svt){
			svt = false;
			changeVideo();
		}
	}

	// AUTOLOAD CODE BLOCK (MAY BE CHANGED OR REMOVED)
	$("a[rel^='vbinline']").vbinline({ /* Put custom options here */ });
	
})(jQuery);

(function($) {
	
	var sliders = [],
	
	defaults = {
		move: 'single',				//	move single or all
		target: '',					//	empty target
		singleDuration: 500,		//	duartion for single element
		doubleClickTimeout: 200,	//	clicks within this period are joined
		animation: {				//	animation properties (see web animations)
			duration: 500,
			iterations: 1,
			delay: 0,
			easing: 'ease-in-out'
		},
	};
	
	$.vbSlider = function(target, _options){
		
		var elements = $(target).children();
		var outer = $('<div class="vb_slider_outer"></div>').insertAfter(target);
		var wrap = $('<div class="vb_slider_wrap"></div>').appendTo(outer);
		
		var slider = {
			wrap: wrap,
			slider: outer,
			prev: $('<div class="vb_slider_prev"><i class="vb-icon-prev"></i></div>').prependTo(outer),
			cont: $('<div class="vb_slider_cont"></div>').append(target).appendTo(wrap),
			next: $('<div class="vb_slider_next"><i class="vb-icon-next"></i></div>').appendTo(outer),
			el: [],
			target: $(target),
			showPrev: function(){
				queueMove(slider, 'r');
			},
			showNext: function(){
				queueMove(slider, 'l');
			},
			basis: $(target).attr('data-width') || elements.innerWidth(),
			skip: function(dir){
				slider.cont.css({
					'margin-left': 0,
					'margin-right': 0,
				});
				var attached = slider.target.children();
				if(attached.length < 1) return;
				var el;
				if(dir == 'l'){
					var el = attached.slice(0, attached.length - slider.count);
					detach(el);
					for(i = 0; i < el.length; i++) slider.el.push(el[i]);
				} else if(dir == 'r') {
					var el = attached.slice(slider.count);
					detach(el);
					for(i = el.length - 1; i >= 0; i--) slider.el.unshift(el[i]);
				}
				slider.rm = false;
				if(slider.stack.length > 0) move(slider, slider.stack.pop());
			},
			rm: false,
			stack: [],
			options: $.extend({}, defaults, _options),
			timeout: false,
		};
		
		slider.i = slider.slider.find('i');
		slider.cont.toggleClass(slider.options.move, true);
		
		setWidth(slider);
		slider.prev.click(function(){ slider.showPrev(); });
		slider.next.click(function(){ slider.showNext(); });
		sliders.push(slider);
		
		return [slider];
	}
	
	$.fn.vbSlider = function(_options){
		var sl = [];
		for(var i = 0; i < this.length; i++){
			var target = this[i], _op = {}, tr = $(target).attr("data-target"), mo = $(target).attr("data-move");
			
			if(tr) _op.target = tr;
			if(mo && mo.trim()) _op.move = mo.trim();
			
			sl.concat($.vbSlider(target, $.extend({}, _options, _op)));
		}
		return sl;
	}
	
	function queueMove(slider, dir){
		if(slider.stack.length > 0 && slider.stack[slider.stack.length - 1] != dir){
			slider.stack.pop();
		} else {
			slider.stack.push(dir);
		}
		if(slider.timeout) clearTimeout(slider.timeout);
		slider.timeout = setTimeout(function(){
			slider.timeout = false;
			if(slider.stack.length > 0) move(slider, slider.stack.pop());
		}, slider.options.doubleClickTimeout);
	}
	
	function move(slider, dir){
		if(slider.rm){
			if(slider.stack.length > 0 && slider.stack[slider.stack.length - 1] != dir){
				slider.stack.pop();
			} else {
				slider.stack.push(dir);
			}
			return;
		}
		slider.rm = true;
		
		var mult = 1;
		while(slider.stack.length > 0 && slider.stack[slider.stack.length - 1] == dir){
			slider.stack.pop();
			mult++;
		}
		
		var n = slider.options.move == 'single' ? 1 : slider.count;
		n *= mult;
		n = n % (slider.count + slider.el.length);
		for(i = 0; i < n && slider.el; i++){
			var el = dir == 'l' ? slider.el.shift() : slider.el.pop();
			dir == 'l' ? slider.target.append(el) : slider.target.prepend(el);
		}
		
		var attached = slider.target.children();
		var fel = dir == 'l' ? attached.slice(0, attached.length - slider.count) : attached.slice(slider.count);
		detach(fel);
		var h = slider.target.innerHeight(), w = slider.width*n;
		dir == 'l' ? slider.target.prepend(fel) : slider.target.append(fel);
		
		var org = {
			'margin-left': (dir == 'l' ? 0 : -w) + 'px',
			'margin-right': (dir == 'l' ? -w : 0) + 'px',
			height: slider.cont.css('height'),
		};
		var dest = {
			'margin-left': (dir == 'l' ? -w : 0) + 'px',
			'margin-right': (dir == 'l' ? 0 : -w) + 'px',
			height: h + 'px',
		};
		var v1 = slider.cont[0].animate([org, dest], slider.options.singleDuration ? $.extend({}, slider.options.animation, {duration: slider.options.singleDuration * n}) : slider.options.animation);
		v1.addEventListener('finish', function(){
			slider.cont.css('height', h);
			slider.skip(dir);
		});
		slider.i.css('top', slider.options.target ? (slider.target.find(slider.options.target).outerHeight(true)/2) : '');
	}
	
	// check for an active inline player before removing an element
	function detach(el){
		if($(el).find('#vbiWrap').length > 0) $.vbiClose();
		$(el).detach();
	}
	
	function setWidth(slider){
		var w = slider.target.innerWidth();
		var b = slider.basis + slider.target.children().outerWidth(true) - slider.target.children().innerWidth();
		var n = Math.floor(w/slider.basis);
		if(n < 1){
			n = 1;
		} else {
			var w1 = 2 - b/(w/n);
			var w2 = b/(w/(n+1));
			if(w2 < w1) n++;
		}
		w = w/n;
		slider.width = w;
		slider.count = n;
		setAttached(slider);
		setTimeout(function(){
			slider.cont.css('height', slider.target.innerHeight());
			slider.i.css('top', slider.options.target ? (slider.target.find(slider.options.target).outerHeight(true)/2) : '');
		}, 20);
	}
	
	function setAttached(slider){
		var attached = slider.target.children();
		if(attached.length < slider.count){
			for(var i = attached.length; i < slider.count && slider.el.length > 0; i++){
				var el = slider.el.shift();
				slider.target.append(el);
			}
		} else if(attached.length > slider.count){
			for(var i = attached.length - 1; i >= slider.count; i--){
				slider.el.unshift(attached[i]);
				detach(attached[i]);
			}
		}
	}

	$(window).on("resize", function() {
		for(var i = 0; i < sliders.length; i++) setWidth(sliders[i]);
	});
	
	$(".vb_slider").vbSlider({ /* Put custom options here */ });
	
})(jQuery);