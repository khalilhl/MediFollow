import React, { useState, useEffect } from "react";
import { Row, Col, Card, Spinner, Alert, Badge, Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";

const HealthcareNews = () => {
    const { t } = useTranslation();
    const [newsData, setNewsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                // Fetch WHO RSS Feed via a reliable proxy
                const rssUrl = "https://www.who.int/rss-feeds/news-english.xml";
                const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&api_key=`);
                
                if (!response.ok) {
                    throw new Error("Unable to fetch news data from upstream proxy.");
                }

                const data = await response.json();
                
                if (data.status === "ok") {
                    setNewsData(data.items);
                } else {
                    throw new Error(data.message || "Failed to load feed");
                }
            } catch (err) {
                console.error("News Feed Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    const stripHtml = (html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        return doc.body.textContent || "";
    };

    return (
        <React.Fragment>
            <div className="iq-navbar-header" style={{ height: "150px" }}>
                <div className="container-fluid iq-container">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="d-flex justify-content-between align-items-center flex-wrap">
                                <div>
                                    <h1>Global Healthcare News</h1>
                                    <p className="mb-0">Stay up to date with the latest from the World Health Organization (WHO).</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="iq-header-img">
                    <img src="/src/assets/images/dashboard/top-header.png" alt="header" className="theme-color-default-img img-fluid w-100 h-100 animated-scaleX" />
                </div>
            </div>

            <div className="conatiner-fluid content-inner mt-n5 py-0">
                <Row>
                    {loading ? (
                        <Col className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-3 text-muted">Loading the latest news bulletins...</p>
                        </Col>
                    ) : error ? (
                        <Col>
                            <Alert variant="danger">
                                <Alert.Heading>Feed Interrupted</Alert.Heading>
                                <p>{error}</p>
                                <hr />
                                <p className="mb-0">Please check your network connection or try again later.</p>
                            </Alert>
                        </Col>
                    ) : (
                        newsData.map((item, index) => {
                            const date = new Date(item.pubDate).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            });
                            
                            const snippet = stripHtml(item.description).slice(0, 150) + "...";
                            
                            // A fallback realistic generic medical thumbnail if image is missing
                            const fallbackImg = "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=1000&auto=format&fit=crop";
                            const thumbnail = item.thumbnail || fallbackImg;

                            return (
                                <Col lg="4" md="6" sm="12" key={index} className="mb-4">
                                    <Card className="h-100 shadow-sm border-0 news-card" style={{ transition: 'transform 0.2s', overflow: 'hidden' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0px)' }}
                                    >
                                        <div style={{ height: "200px", overflow: "hidden", position: "relative" }}>
                                            <img 
                                                src={thumbnail} 
                                                alt="News Thumbnail" 
                                                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                                onError={(e) => { e.target.src = fallbackImg }} 
                                            />
                                            {item.categories && item.categories.length > 0 && (
                                                <Badge bg="primary" className="position-absolute" style={{ top: "15px", left: "15px" }}>
                                                    {item.categories[0]}
                                                </Badge>
                                            )}
                                        </div>
                                        <Card.Body className="d-flex flex-column">
                                            <div className="d-flex justify-content-between text-muted small mb-2">
                                                <span><i className="ri-calendar-event-line me-1"></i>{date}</span>
                                                <span>WHO</span>
                                            </div>
                                            <Card.Title as="h5" className="fw-bold mb-3" style={{ fontSize: "1.1rem" }}>
                                                {item.title}
                                            </Card.Title>
                                            <Card.Text className="text-secondary mb-4" style={{ fontSize: "0.9rem" }}>
                                                {snippet}
                                            </Card.Text>
                                            <div className="mt-auto">
                                                <Button href={item.link} target="_blank" rel="noopener noreferrer" variant="outline-primary" className="w-100 rounded-pill">
                                                    Read Full Article <i className="ri-arrow-right-line ms-1"></i>
                                                </Button>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            );
                        })
                    )}
                </Row>
            </div>
        </React.Fragment>
    );
};

export default HealthcareNews;
