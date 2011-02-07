Given /^the following routes:$/ do |routes|
  Route.create!(routes.hashes)
end

When /^I delete the (\d+)(?:st|nd|rd|th) route$/ do |pos|
  visit routes_path
  within("table tr:nth-child(#{pos.to_i+1})") do
    click_link "Destroy"
  end
end

Then /^I should see the following routes:$/ do |expected_routes_table|
  expected_routes_table.diff!(tableish('table tr', 'td,th'))
end
