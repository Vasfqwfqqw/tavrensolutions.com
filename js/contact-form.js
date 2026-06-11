// Contact form via Web3Forms (AJAX). No mail client ever opens.
// Honeypot spam field, required-field validation, accessible inline states.
(function () {
  'use strict';
  var form = document.getElementById('contact-form');
  if (!form) return;

  var status = document.getElementById('form-status');
  var submit = form.querySelector('button[type="submit"]');
  var keyField = form.querySelector('[name="access_key"]');
  var ACCESS_KEY = keyField ? keyField.value : '';

  function setStatus(msg, kind) {
    status.textContent = msg;
    status.classList.remove('is-error', 'is-success', 'hidden');
    status.classList.add(kind === 'error' ? 'is-error' : 'is-success');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Honeypot: real users leave this empty.
    if (form.querySelector('[name="botcheck"]') && form.querySelector('[name="botcheck"]').checked) {
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!ACCESS_KEY || ACCESS_KEY === 'YOUR_WEB3FORMS_ACCESS_KEY') {
      setStatus(
        'The contact form is not yet configured. Please email contact@tavrensolutions.com directly for now.',
        'error'
      );
      return;
    }

    submit.disabled = true;
    var original = submit.textContent;
    submit.textContent = 'Sending…';

    var data = new FormData(form);
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: data,
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (json) {
        if (json.success) {
          form.reset();
          setStatus('Thank you — your message has been sent. We will reply to the email you provided.', 'success');
        } else {
          setStatus(
            'Sorry, something went wrong. Please try again, or email contact@tavrensolutions.com directly.',
            'error'
          );
        }
      })
      .catch(function () {
        setStatus(
          'Sorry, your message could not be sent. Please email contact@tavrensolutions.com directly.',
          'error'
        );
      })
      .finally(function () {
        submit.disabled = false;
        submit.textContent = original;
      });
  });
})();
