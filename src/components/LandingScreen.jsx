function LandingScreen({ orgName, onStart }) {
  return (
    <section aria-labelledby="landing-heading">
      <h1 id="landing-heading">Become a host-home with {orgName}</h1>
      <p>
        {orgName} works with adults in DC's DDA program who need a safe home and a caring
        household. If you have a spare room, this short quiz tells us whether opening your
        home could be a good fit.
      </p>
      <p>
        It takes about 5 minutes. The home you're offering must be located in Washington, DC.
        If it's in Maryland instead, it must be within 25 miles of DC's DDS main office at 250
        E Street SW. After you finish, someone from our team will follow up with you.
      </p>
      <button type="button" className="btn btn-primary btn-block" onClick={onStart}>
        Start the quiz
      </button>
    </section>
  );
}

export default LandingScreen;
