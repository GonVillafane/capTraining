using videoclub from '../db/schema';

service CatalogService @(path:'/catalog') {
  @readonly entity Movies as projection on videoclub.Movies;
  
  entity Customers as projection on videoclub.Customers;
  
  entity Rentals as projection on videoclub.Rentals;
  
  action rentMovie(movieId: String, customerId: String, quantity: Integer) returns String;
  action returnRental(rentalId: String) returns String;
  
  function getMovieStats() returns array of {
    movieTitle: String;
    totalRented: Integer;
    currentStock: Integer;
  };
}