// frappe.ui.Capture
// Author - Achilles Rasquinha <achilles@frappe.io>

/**
 * @description Converts a canvas, image or a video to a data URL string.
 *
 * @param 	{HTMLElement} element - canvas, img or video.
 * @returns {string} 			  - The data URL string.
 *
 * @example
 * frappe._.get_data_uri(video)
 * // returns "data:image/pngbase64,..."
 */
frappe._.get_data_uri = element => {

	const width = element.videoWidth;
	const height = element.videoHeight;

	const $canvas = $('<canvas/>');
	$canvas[0].width = width;
	$canvas[0].height = height;

	const context = $canvas[0].getContext('2d');
	context.drawImage(element, 0, 0, width, height);

	const data_uri = $canvas[0].toDataURL('image/png');

	return data_uri;
};

/**
 * @description Frappe's Capture object.
 *
 * @example
 * const capture = frappe.ui.Capture()
 * capture.show()
 *
 * capture.click((data_uri) => {
 * 	// do stuff
 * })
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Taking_still_photos
 */
frappe.ui.Capture = class {
	constructor(options = {}) {
		this.options = frappe.ui.Capture.OPTIONS;
		this.set_options(options);

		this.facing_mode = "environment";
		this.images = [];
	}

	set_options(options) {
		this.options = { ...frappe.ui.Capture.OPTIONS, ...options };

		return this;
	}

	render() {
		let constraints = {
			video: {
				facingMode: this.facing_mode
			}
		};

		return navigator.mediaDevices.getUserMedia(constraints).then(stream => {
			this.stream = stream;

			this.dialog = new frappe.ui.Dialog({
				title: this.options.title,
				animate: this.options.animate,
				on_hide: () => this.stop_media_stream()
			});

			this.dialog.get_close_btn().on('click', () => {
				this.hide();
			});

			const set_take_photo_action = () => {
				this.dialog.set_primary_action(__('Take Photo'), () => {
					const data_url = frappe._.get_data_uri(video);
					$e.find('.fc-preview').attr('src', data_url);

					this.images.push(data_url);

					$e.find('.fc-stream').hide();
					$e.find('.fc-preview').show();

					this.dialog.set_secondary_action_label(__('Retake'));
					this.dialog.get_secondary_btn().show();
					this.dialog.custom_actions.find(".btn-multiple").show();

					this.dialog.set_primary_action(__('Submit'), () => {
						this.hide();
						if (this.callback) this.callback(this.images);
					});
				});

				this.dialog.set_secondary_action_label(__('Switch Camera'));
				this.dialog.set_secondary_action(() => {
					this.facing_mode = this.facing_mode == "environment" ? "user" : "environment";
					frappe.show_alert({
						message: __("Switching Camera")
					});
					this.hide();
					this.show();
				});
			};

			set_take_photo_action();

			this.dialog.set_secondary_action(() => {
				this.images.pop();
				$e.find('.fc-preview').hide();
				$e.find('.fc-stream').show();

				this.dialog.get_primary_btn().off('click');
				set_take_photo_action();
			});

			this.dialog.add_custom_action(__("Take Multiple"), () => {
				$e.find('.fc-preview').hide();
				$e.find('.fc-stream').show();

				this.dialog.get_primary_btn().off('click');
				this.dialog.custom_actions.find(".btn-multiple").hide();
				set_take_photo_action();
			}, "btn-multiple");

			this.dialog.custom_actions.find(".btn-multiple").hide();

			const $e = $(frappe.ui.Capture.TEMPLATE);

			const video = $e.find('video')[0];
			video.srcObject = this.stream;
			video.play();
			const $container = $(this.dialog.body);

			$container.html($e);
		});
	}

	show() {
		this.render()
			.then(() => {
				this.dialog.show();
			})
			.catch(err => {
				if (this.options.error) {
					frappe.show_alert(frappe.ui.Capture.ERR_MESSAGE, 3);
				}

				throw err;
			});
	}

	hide() {
		if (this.dialog) this.dialog.hide();
		this.stop_media_stream();
	}

	stop_media_stream() {
		if (this.stream) {
			this.stream.getTracks().forEach((track) => {
				track.stop();
			});
		}
	}

	submit(fn) {
		this.callback = fn;
	}
};
frappe.ui.Capture.OPTIONS = {
	title: __("Camera"),
	animate: false,
	error: false
};
frappe.ui.Capture.ERR_MESSAGE = __('Unable to load camera.');
frappe.ui.Capture.TEMPLATE = `
<div class="frappe-capture">
	<div class="panel panel-default">
		<div class="embed-responsive embed-responsive-16by9">
			<img class="fc-preview embed-responsive-item" style="object-fit: contain; display: none;"/>
			<video class="fc-stream embed-responsive-item">${frappe.ui.Capture.ERR_MESSAGE}</video>
		</div>
	</div>
</div>
`;
