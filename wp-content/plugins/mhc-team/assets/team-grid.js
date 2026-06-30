(function () {
	var modal    = document.getElementById('mhcTeamModal');
	if (!modal) return;

	var backdrop = modal.querySelector('.mhc-team-modal__backdrop');
	var closeBtn = modal.querySelector('.mhc-team-modal__close');
	var elPhoto  = modal.querySelector('.mhc-team-modal__photo');
	var elName   = modal.querySelector('.mhc-team-modal__name');
	var elTitle  = modal.querySelector('.mhc-team-modal__title');
	var elBio    = modal.querySelector('.mhc-team-modal__bio');
	var elPhone  = modal.querySelector('.mhc-team-modal__phone');
	var elEmail  = modal.querySelector('.mhc-team-modal__email');
	var elLinked = modal.querySelector('.mhc-team-modal__linkedin');

	function openModal(id) {
		var d = mhcTeamData[id];
		if (!d) return;

		// Hide the image, swap to the grid thumbnail (already cached = instant),
		// then fade in once it's ready so the previous photo never flashes.
		elPhoto.classList.remove('is-loaded');
		elPhoto.onload = function () { elPhoto.classList.add('is-loaded'); };
		elPhoto.src = d.thumb || d.photo || '';
		elPhoto.alt = d.name  || '';
		if (elPhoto.complete) { elPhoto.classList.add('is-loaded'); }
		elName.textContent  = d.name  || '';
		elTitle.textContent = d.title || '';
		elBio.innerHTML     = d.bio   || '';

		if (d.phone) {
			elPhone.href = 'tel:' + d.phone.replace(/[^0-9+]/g, '');
			elPhone.querySelector('span').textContent = d.phone;
			elPhone.style.display = 'flex';
		} else {
			elPhone.style.display = 'none';
		}

		if (d.email) {
			elEmail.href = 'mailto:' + d.email;
			elEmail.querySelector('span').textContent = d.email;
			elEmail.style.display = 'flex';
		} else {
			elEmail.style.display = 'none';
		}

		if (d.linkedin) {
			elLinked.href = d.linkedin;
			elLinked.style.display = 'flex';
		} else {
			elLinked.style.display = 'none';
		}

		modal.removeAttribute('hidden');
		document.body.style.overflow = 'hidden';
		closeBtn.focus();
	}

	function closeModal() {
		modal.setAttribute('hidden', '');
		document.body.style.overflow = '';
	}

	document.addEventListener('click', function (e) {
		var card = e.target.closest('.mhc-team-card');
		if (card) openModal(card.dataset.id);
	});

	closeBtn.addEventListener('click', closeModal);
	backdrop.addEventListener('click', closeModal);

	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') closeModal();
	});
})();
