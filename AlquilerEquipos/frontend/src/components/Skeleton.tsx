import type { ReactNode } from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton ${className}`} />;
}

export function LoadingRegion({
  children,
  label = "Cargando contenido",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div
      className="loading-region"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function EquipmentSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="equipment-grid">
      {Array.from({ length: count }, (_, i) => (
        <div className="equipment-card" key={i}>
          <Skeleton className="skeleton-image" />
          <div className="equipment-info skeleton-stack">
            <Skeleton className="skeleton-short" />
            <Skeleton />
            <Skeleton className="skeleton-medium" />
            <div className="equipment-footer">
              <Skeleton className="skeleton-short" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div className="skeleton-rows">
      {Array.from({ length: 5 }, (_, i) => (
        <div className="skeleton-row" key={i}>
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton className="skeleton-short" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ path }: { path: string }) {
  return (
    <LoadingRegion label="Cargando tu espacio">
      <div className="page-heading">
        <div className="skeleton-heading skeleton-stack">
          <Skeleton className="skeleton-title" />
          <Skeleton className="skeleton-medium" />
        </div>
        <Skeleton className="skeleton-action" />
      </div>
      {path === "/" ? (
        <>
          <div className="stats-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <div className="stat skeleton-stack" key={i}>
                <Skeleton />
                <Skeleton className="skeleton-number" />
                <Skeleton />
              </div>
            ))}
          </div>
          <div className="dashboard-columns">
            <RowsSkeleton />
            <div className="skeleton-stack">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          </div>
          <section className="inventory-preview">
            <EquipmentSkeleton count={4} />
          </section>
        </>
      ) : path === "/equipos" ? (
        <>
          <Skeleton className="skeleton-toolbar" />
          <EquipmentSkeleton />
        </>
      ) : path === "/disponibilidad" ? (
        <div className="availability-form">
          <Skeleton className="skeleton-action" />
          <Skeleton className="skeleton-action" />
          <Skeleton className="skeleton-action" />
        </div>
      ) : (
        <>
          <Skeleton className="skeleton-toolbar" />
          <RowsSkeleton />
        </>
      )}
    </LoadingRegion>
  );
}
