namespace videoclub;

using { managed, cuid } from '@sap/cds/common';

entity Movies : cuid, managed {
  title        : String(255) not null;
  genre        : String(100);
  director     : String(255);
  year         : Integer;
  description  : String(1000);
  stock        : Integer default 0;
  rentedCount  : Integer default 0;
  price        : Decimal(10,2);
}

entity Customers : cuid, managed {
  name         : String(255) not null;
  email        : String(255);
  phone        : String(50);
  address      : String(500);
}

entity Rentals : cuid, managed {
  customer     : Association to Customers;
  movie        : Association to Movies;
  quantity     : Integer not null default 1;
  rentalDate   : Date not null;
  returnDate   : Date;
  status       : String(20) default 'ACTIVE'; // ACTIVE, RETURNED
  totalPrice   : Decimal(10,2);
}