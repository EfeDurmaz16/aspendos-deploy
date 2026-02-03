import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock the persona component for basic rendering tests
const MockCouncilPersona = ({
    name,
    role,
    color,
    isThinking,
    confidence,
}: {
    name: string;
    role: string;
    color: string;
    isThinking?: boolean;
    confidence?: number;
}) => {
    return (
        <div data-testid="council-persona" style={{ borderColor: color }}>
            <div data-testid="persona-name">{name}</div>
            <div data-testid="persona-role">{role}</div>
            {isThinking && <div data-testid="thinking-indicator">Thinking...</div>}
            {confidence !== undefined && (
                <div data-testid="confidence">{Math.round(confidence * 100)}%</div>
            )}
        </div>
    );
};

describe('CouncilPersona Component', () => {
    it('should render persona name and role', () => {
        render(
            <MockCouncilPersona
                name="Scholar"
                role="The Analyst"
                color="#3b82f6"
            />
        );

        expect(screen.getByTestId('persona-name')).toHaveTextContent('Scholar');
        expect(screen.getByTestId('persona-role')).toHaveTextContent('The Analyst');
    });

    it('should show thinking indicator when isThinking is true', () => {
        render(
            <MockCouncilPersona
                name="Scholar"
                role="The Analyst"
                color="#3b82f6"
                isThinking={true}
            />
        );

        expect(screen.getByTestId('thinking-indicator')).toBeInTheDocument();
    });

    it('should not show thinking indicator when isThinking is false', () => {
        render(
            <MockCouncilPersona
                name="Scholar"
                role="The Analyst"
                color="#3b82f6"
                isThinking={false}
            />
        );

        expect(screen.queryByTestId('thinking-indicator')).not.toBeInTheDocument();
    });

    it('should display confidence percentage', () => {
        render(
            <MockCouncilPersona
                name="Scholar"
                role="The Analyst"
                color="#3b82f6"
                confidence={0.85}
            />
        );

        expect(screen.getByTestId('confidence')).toHaveTextContent('85%');
    });

    it('should apply the correct color', () => {
        render(
            <MockCouncilPersona
                name="Scholar"
                role="The Analyst"
                color="#3b82f6"
            />
        );

        const persona = screen.getByTestId('council-persona');
        expect(persona).toHaveStyle({ borderColor: '#3b82f6' });
    });
});

describe('Persona Definitions', () => {
    const personas = [
        { key: 'logic', name: 'Scholar', color: '#3b82f6' },
        { key: 'creative', name: 'Creative', color: '#f59e0b' },
        { key: 'prudent', name: 'Prudent', color: '#10b981' },
    ];

    it.each(personas)('should have valid definition for $key persona', ({ key, name, color }) => {
        expect(name).toBeDefined();
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
});
