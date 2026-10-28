import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TenantBrandLogo from "../components/brand/TenantBrandLogo";

describe("TenantBrandLogo - Dynamic Fallback System", () => {
  it("renders tenant logo image when empresa.logo_url is provided", () => {
    const empresa = {
      id: "tenant-cova-01",
      nombre_comercial: "Cova - Taller & Llantera",
      logo_url: "https://example.com/cova-logo.png",
      color_primario: "#2563EB",
    };

    render(<TenantBrandLogo empresa={empresa} size="md" />);

    const img = screen.getByRole("img");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/cova-logo.png");
    expect(img.getAttribute("alt")).toBe("Cova - Taller & Llantera");
  });

  it("selects isotipo_url for compact symbol-only layouts (e.g. switcher avatar)", () => {
    const empresaMultiAsset = {
      id: "tenant-cova-01",
      nombre_comercial: "Cova - Taller & Llantera",
      logo_url: "https://example.com/cova-light.png",
      logo_url_dark: "https://example.com/cova-dark.png",
      isotipo_url: "https://example.com/cova-isotipo.png",
    };

    render(
      <TenantBrandLogo
        empresa={empresaMultiAsset}
        size="sm"
        layout="symbol-only"
        variant="dark"
      />
    );

    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://example.com/cova-isotipo.png");
  });

  it("selects logo_url_dark for dark background surfaces when horizontal or large", () => {
    const empresaMultiAsset = {
      id: "tenant-cova-01",
      nombre_comercial: "Cova - Taller & Llantera",
      logo_url: "https://example.com/cova-light.png",
      logo_url_dark: "https://example.com/cova-dark.png",
      isotipo_url: "https://example.com/cova-isotipo.png",
    };

    render(
      <TenantBrandLogo
        empresa={empresaMultiAsset}
        size="lg"
        variant="dark"
      />
    );

    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://example.com/cova-dark.png");
  });

  it("selects logo_url for light/printed surfaces (Carta PDF, receipt ticket)", () => {
    const empresaMultiAsset = {
      id: "tenant-cova-01",
      nombre_comercial: "Cova - Taller & Llantera",
      logo_url: "https://example.com/cova-light.png",
      logo_url_dark: "https://example.com/cova-dark.png",
      isotipo_url: "https://example.com/cova-isotipo.png",
    };

    render(
      <TenantBrandLogo
        empresa={empresaMultiAsset}
        size="lg"
        variant="light"
      />
    );

    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://example.com/cova-light.png");
  });

  it("falls back to TallerTrack official logo when empresa.logo_url is null or empty", () => {
    const empresaSinLogo = {
      id: "tenant-sin-logo",
      nombre_comercial: "Taller Hermanos Ramos",
      logo_url: null,
      color_primario: "#0F172A",
    };

    const { container } = render(
      <TenantBrandLogo empresa={empresaSinLogo} size="md" />
    );

    // No custom image should be present
    expect(container.querySelector("img")).toBeNull();
    // TallerTrack official SVG mark must be rendered
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("falls back to TallerTrack official logo when empresa is undefined", () => {
    const { container } = render(<TenantBrandLogo size="sm" variant="dark" />);

    expect(container.querySelector("img")).toBeNull();
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("gracefully switches to TallerTrack logo if the tenant image fails to load (onError)", () => {
    const empresaConLogoRoto = {
      id: "tenant-broken-logo",
      nombre_comercial: "Taller Roto",
      logo_url: "https://invalid-url.com/non-existent.png",
      color_primario: "#2563EB",
    };

    const { container } = render(
      <TenantBrandLogo empresa={empresaConLogoRoto} size="md" />
    );

    const img = screen.getByRole("img");
    expect(img).toBeDefined();

    // Trigger image loading failure
    fireEvent.error(img);

    // After error, image is gone and TallerTrack SVG fallback takes its place
    expect(container.querySelector("img")).toBeNull();
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });
});
