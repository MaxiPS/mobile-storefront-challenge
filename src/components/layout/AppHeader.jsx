import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ShoppingCart } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.jsx";
import { useCartStore } from "@/hooks/useCartStore.js";

export default function AppHeader({ breadcrumbs = [] }) {
  const { cartCount } = useCartStore();

  return (
    <header className="site-header">
      <div className="site-header__main">
        <div className="site-header__inner">
          <Link className="store-brand" to="/" aria-label="ITX Store home">
            <span className="store-brand__name">
              <span className="store-brand__name-main">ITX</span>
              <span className="store-brand__name-accent">Store</span>
            </span>
          </Link>

          <div
            className="cart-summary"
            role="group"
            aria-label={`Cart items: ${cartCount}`}
          >
            <ShoppingCart size={23} strokeWidth={1.8} aria-hidden="true" />
            <span className="cart-summary__count" aria-live="polite">
              {cartCount}
            </span>
          </div>
        </div>
      </div>

      {breadcrumbs.length > 0 && (
        <div className="site-header__breadcrumb-row">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((breadcrumb, index) => {
                const isCurrentPage = index === breadcrumbs.length - 1;

                return (
                  <Fragment key={breadcrumb.label}>
                    {index > 0 && (
                      <BreadcrumbSeparator>
                        <ChevronRight aria-hidden="true" />
                      </BreadcrumbSeparator>
                    )}
                    <BreadcrumbItem>
                      {isCurrentPage ? (
                        <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={breadcrumb.to}>{breadcrumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}
    </header>
  );
}
