function ThankYouScreen({ orgName }) {
  return (
    <section aria-labelledby="thankyou-heading">
      <h1 id="thankyou-heading">Thank you</h1>
      <p>
        We've received your information. A member of the {orgName} team will follow up with
        you soon.
      </p>
      <p>We're grateful you're considering opening your home.</p>
    </section>
  );
}

export default ThankYouScreen;
