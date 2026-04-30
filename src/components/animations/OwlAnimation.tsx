import React from 'react';
import './OwlAnimation.css';

interface OwlAnimationProps {
    message?: string;
}

const OwlAnimation: React.FC<OwlAnimationProps> = ({ message }) => {
    return (
        <div className="owl-container">
            <div className="cloud cloud--1"></div>
            <div className="cloud cloud--2"></div>

            <div className="owl-main">
                {message && (
                    <div className="owl-speech-bubble">
                        {message}
                        <div className="owl-speech-arrow"></div>
                    </div>
                )}
                <div className="owl">
                    <div className="owl__head">
                        <div className="owl__tuft owl__tuft--left"></div>
                        <div className="owl__tuft owl__tuft--right"></div>
                        <div className="owl__eye owl__eye--left"></div>
                        <div className="owl__eye owl__eye--right"></div>
                        <div className="owl__beak"></div>
                    </div>
                    <div className="owl__body"></div>
                    <div className="owl__wing owl__wing--left"></div>
                    <div className="owl__wing owl__wing--right"></div>
                    <div className="owl__foot owl__foot--left"></div>
                    <div className="owl__foot owl__foot--right"></div>
                </div>
            </div>
        </div>
    );
};

export default OwlAnimation;
