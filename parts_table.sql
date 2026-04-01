create table if not exists parts
(
  _id int not null,
  price double(10,2) not null,
  description varchar(50) not null,
  primary key (_id)
) engine = innodb;
