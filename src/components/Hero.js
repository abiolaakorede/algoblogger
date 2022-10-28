export default function Hero() {
    return (
        <section id="hero" className="hero">
            <div className="info d-flex align-items-center">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-6 text-center">
                            <h2 data-aos="fade-down">Welcome to <span>AlgoBlogger</span></h2>
                            <p data-aos="fade-up">The World's Best Decentralized Blog </p>
                            <a data-aos="fade-up" data-aos-delay={200} href="#get-started" className="btn-get-started">Get Started</a>
                        </div>
                    </div>
                </div>
            </div>
            <div id="hero-carousel" className="carousel slide" data-bs-ride="carousel" data-bs-interval={5000}>
                <div className="carousel-item active" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1604933762023-7213af7ff7a7?ixlib=rb-4.0.3)' }} />
                <div className="carousel-item" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1519337265831-281ec6cc8514?ixlib=rb-4.0.3)' }} />
                <div className="carousel-item" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1487611459768-bd414656ea10?ixlib=rb-4.0.3)' }} />
                <a className="carousel-control-prev" href="#hero-carousel" role="button" data-bs-slide="prev">
                    <span className="carousel-control-prev-icon bi bi-chevron-left" aria-hidden="true" />
                </a>
                <a className="carousel-control-next" href="#hero-carousel" role="button" data-bs-slide="next">
                    <span className="carousel-control-next-icon bi bi-chevron-right" aria-hidden="true" />
                </a>
            </div>
        </section>


    )
}