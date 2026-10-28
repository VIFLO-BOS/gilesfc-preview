/**
 * Giles Financial Consulting — motion
 *
 * Framer-style page motion without a framework:
 *  - scroll reveals: fade + rise 75px on a soft spring, siblings staggered 200ms,
 *    fired once when half of the element is in view (IntersectionObserver)
 *  - hero intro sequence on load, plus a two-speed parallax (photo 20%, copy 40%)
 *  - infinite marquees (name strip, keyword chips)
 *  - count-up numbers for stat tiles
 * Everything is skipped when the visitor prefers reduced motion.
 */
( function () {
	'use strict';

	var reduce = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var root = document.documentElement;
	root.classList.add( 'js' );
	if ( reduce ) {
		root.classList.add( 'reduce-motion' );
		return;
	}

	/* ---------- helpers ---------------------------------------------------- */

	function qsa( sel, ctx ) {
		return Array.prototype.slice.call( ( ctx || document ).querySelectorAll( sel ) );
	}

	/**
	 * Mark elements for reveal and stagger siblings that share a parent.
	 *
	 * @param {string} selector
	 * @param {Object} opts   { step: ms between siblings, from: 'fade' for opacity-only, base: ms, max: ms cap }
	 */
	function prime( selector, opts ) {
		opts = opts || {};
		var groups = new Map();
		qsa( selector ).forEach( function ( el ) {
			if ( el.classList.contains( 'gfc-reveal' ) || el.closest( '.gfc-hero, .gfc-no-reveal, .gfc-reveal' ) ) {
				return;
			}
			var key = el.parentElement;
			var i = groups.get( key ) || 0;
			groups.set( key, i + 1 );
			el.classList.add( 'gfc-reveal' );
			if ( opts.from ) {
				el.setAttribute( 'data-from', opts.from );
			}
			var delay = ( opts.base || 0 ) + i * ( opts.step === undefined ? 200 : opts.step );
			el.style.setProperty( '--d', Math.min( delay, opts.max || 1000 ) + 'ms' );
		} );
	}

	/* ---------- scroll reveals ------------------------------------------- */

	// Section heads: eyebrow, heading, lead reveal one after another; the lead or
	// button that sits beside a head (two-column headers) follows it.
	prime( '.gfc-section-head > *, .gfc-section-head ~ :is(p, .wp-block-buttons), .gfc-page-hero .eyebrow, .gfc-page-hero h1, .gfc-page-hero .gfc-lead, .gfc-page-hero .gfc-chips, .gfc-page-hero .wp-block-buttons' );
	// Grids of cards, features, steps, posts, stats.
	prime( '.gfc-grid > .is-style-card, .gfc-bento > .is-style-card, .gfc-feature, .gfc-step, .gfc-posts .wp-block-post, .gfc-stat, .gfc-contact-item, .gfc-faq-group, .gfc-founder-copy > *' );
	// Media and standalone blocks.
	prime( '.gfc-media, .gfc-portrait, .gfc-form-card, .gfc-embed', { step: 0 } );
	prime( '.gfc-marquee', { from: 'fade', step: 0 } );
	// Prose columns reveal in sequence; FAQ items cascade.
	prime( '.wp-block-details', { step: 100, max: 600 } );
	prime( '.wp-block-columns > .wp-block-column > :is(h2, h3, p, ul, .wp-block-buttons, blockquote):not(.gfc-section-head *)' );
	prime( '.gfc-cta-card > *' );

	var revealed = qsa( '.gfc-reveal' );
	if ( 'IntersectionObserver' in window ) {
		var reveal = function ( entries, obs ) {
			entries.forEach( function ( entry ) {
				if ( entry.isIntersecting ) {
					entry.target.classList.add( 'is-in' );
					obs.unobserve( entry.target );
				}
			} );
		};
		// Half of the element must be visible (appear threshold 0.5); tall elements
		// that could never reach 50% use a low threshold instead.
		var ioHalf = new IntersectionObserver( reveal, { threshold: 0.5 } );
		var ioTall = new IntersectionObserver( reveal, { threshold: 0.15 } );
		var limit = window.innerHeight * 0.5;
		revealed.forEach( function ( el ) {
			( el.offsetHeight > limit ? ioTall : ioHalf ).observe( el );
		} );
	} else {
		revealed.forEach( function ( el ) {
			el.classList.add( 'is-in' );
		} );
	}

	/* ---------- hero intro + parallax ----------------------------------- */

	var hero = document.querySelector( '.gfc-hero' );
	if ( hero ) {
		var order = [ '.eyebrow', 'h1', '.gfc-lead', '.wp-block-buttons' ];
		var t = 0;
		order.forEach( function ( sel ) {
			qsa( sel, hero ).forEach( function ( el ) {
				el.classList.add( 'gfc-intro' );
				el.style.setProperty( '--d', t + 'ms' );
				t += 200;
			} );
		} );
		// Let the browser paint the hidden state first, then play.
		requestAnimationFrame( function () {
			requestAnimationFrame( function () {
				hero.classList.add( 'is-ready' );
			} );
		} );
		var strip = hero.nextElementSibling;
		if ( strip && strip.classList.contains( 'gfc-strip' ) ) {
			strip.classList.add( 'gfc-intro' );
			strip.style.setProperty( '--d', t + 'ms' );
			requestAnimationFrame( function () {
				requestAnimationFrame( function () {
					strip.classList.add( 'is-ready' );
				} );
			} );
		}

		// Parallax: the photo drifts at 20% of scroll, the copy at 40%.
		var bg = hero.querySelector( '.wp-block-cover__image-background' );
		var inner = hero.querySelector( '.wp-block-cover__inner-container' );
		var ticking = false;
		var onScroll = function () {
			if ( ticking ) {
				return;
			}
			ticking = true;
			requestAnimationFrame( function () {
				ticking = false;
				var y = window.scrollY;
				if ( y > hero.offsetHeight + 100 ) {
					return;
				}
				if ( bg ) {
					bg.style.transform = 'translate3d(0,' + ( y * 0.2 ).toFixed( 1 ) + 'px,0)';
				}
				if ( inner ) {
					inner.style.transform = 'translate3d(0,' + ( y * 0.4 ).toFixed( 1 ) + 'px,0)';
				}
			} );
		};
		window.addEventListener( 'scroll', onScroll, { passive: true } );
		onScroll();
	}

	/* ---------- marquees ------------------------------------------------- */

	qsa( '.gfc-marquee' ).forEach( function ( m ) {
		var track = m.querySelector( '.gfc-marquee__track' );
		if ( ! track ) {
			// Wrap every item in a track so the whole row loops, not just the first item.
			track = document.createElement( 'div' );
			track.className = 'gfc-marquee__track';
			while ( m.firstChild ) {
				track.appendChild( m.firstChild );
			}
			m.appendChild( track );
		}
		if ( ! track.children.length ) {
			return;
		}
		// Duplicate until the track is at least twice the viewport so the loop is seamless.
		var original = track.innerHTML;
		var guard = 0;
		while ( track.scrollWidth < m.clientWidth * 2 && guard < 6 ) {
			track.insertAdjacentHTML( 'beforeend', original );
			guard++;
		}
		track.insertAdjacentHTML( 'beforeend', track.innerHTML ); // second half for the -50% loop
		var speed = parseFloat( m.getAttribute( 'data-speed' ) || '60' ); // px per second
		track.style.setProperty( '--marquee-duration', track.scrollWidth / 2 / speed + 's' );
		if ( m.hasAttribute( 'data-reverse' ) ) {
			track.style.animationDirection = 'reverse';
		}
		m.classList.add( 'is-running' );
	} );

	/* ---------- count-up numbers ----------------------------------------- */

	function countUp( el ) {
		var target = parseFloat( el.getAttribute( 'data-count' ) );
		var prefix = el.getAttribute( 'data-prefix' ) || '';
		var suffix = el.getAttribute( 'data-suffix' ) || '';
		var decimals = ( String( target ).split( '.' )[ 1 ] || '' ).length;
		var duration = 1400;
		var start = null;
		function frame( now ) {
			if ( ! start ) {
				start = now;
			}
			var p = Math.min( 1, ( now - start ) / duration );
			var eased = 1 - Math.pow( 1 - p, 3 );
			el.textContent = prefix + ( target * eased ).toFixed( decimals ) + suffix;
			if ( p < 1 ) {
				requestAnimationFrame( frame );
			}
		}
		requestAnimationFrame( frame );
	}

	var counters = qsa( '[data-count]' );
	if ( counters.length && 'IntersectionObserver' in window ) {
		var cio = new IntersectionObserver(
			function ( entries ) {
				entries.forEach( function ( entry ) {
					if ( entry.isIntersecting ) {
						countUp( entry.target );
						cio.unobserve( entry.target );
					}
				} );
			},
			{ threshold: 0.5 }
		);
		counters.forEach( function ( el ) {
			cio.observe( el );
		} );
	}
} )();
